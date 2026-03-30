const {GoogleGenAI}=require('@google/genai')
const { z } =require('zod')
const {zodToJsonSchema}=require('zod-to-json-schema')
const puppeteer=require('puppeteer')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const ai=new GoogleGenAI({
    apiKey:process.env.GOOGLE_GENAI_KEY
})

function buildGeminiError(error, fallbackMessage) {
    const code = error?.error?.code || error?.status || 500
    const normalizedCode = Number(code)

    let message = fallbackMessage
    if (normalizedCode === 429) {
        message = 'Gemini quota exceeded. Please try again later.'
    } else if (normalizedCode === 503) {
        message = 'Gemini API is currently overloaded. Please try again in a moment.'
    } else if (error?.error?.message || error?.message) {
        message = error?.error?.message || error?.message
    }

    const wrappedError = new Error(message)
    wrappedError.statusCode = Number.isFinite(normalizedCode) ? normalizedCode : 500
    wrappedError.isGeminiError = true
    return wrappedError
}

async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 800) {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            const code = Number(error?.error?.code || error?.status)
            const retryable = code === 429 || code === 503
            if (!retryable || attempt === maxRetries) break

            const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }

    throw lastError
}

const interviewReportSchema=z.object({
    matchScore:z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description ")
    ,
    technicalQuestions:z.array(z.object({
        question:z.string().describe("The technical question can be asked in the interview"),
        intention:z.string().describe("The intention of interviewer behind aksing this question"),
        answer:z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intentions and how to approach them."),
    behavioralQuestions:z.array(z.object({
        question:z.string().describe("The technical question can be asked in the interview"),
        intention:z.string().describe("The intention of interviewer behind aksing this question"),
        answer:z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to approach them."),
    skillGaps:z.array(z.object({
        skill:z.string().describe("The skill which the candidate is lacking"),
        severity:z.enum(["low","medium","high"]).describe("The severity of this skill gap i.e how important they are for the given job")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan:z.array(z.object({
        day:z.number().describe("The day number in the preparation plan, starting from 1 "),
        focus:z.string().describe("The main focus of this day in the preparation plan e.g. data structures, system design, mock interview,etc"),
        tasks:z.array(z.string()).describe("List of the tasks to be done on this day ")
    })).describe("A day-wise preparation plan for the candidate to follow in order the plan"),
    title:z.string().describe("The title of the job for which the interview report is generated")

})

function toArray(value){
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
        return value
            .split(/\n+/)
            .map(item => item.trim())
            .filter(Boolean)
    }
    return []
}

function normalizeTextToken(value) {
    if (typeof value !== 'string') return ''
    return value.trim()
}

function parseLabeledQuestionTokens(tokens, defaultIntention) {
    const rows = []
    let current = { question: '', intention: '', answer: '' }
    let activeField = null

    const flushCurrent = () => {
        const question = normalizeTextToken(current.question)
        const intention = normalizeTextToken(current.intention) || defaultIntention
        const answer = normalizeTextToken(current.answer) || 'Explain your approach clearly with a concrete example.'

        if (question) {
            rows.push({ question, intention, answer })
        }

        current = { question: '', intention: '', answer: '' }
        activeField = null
    }

    for (const rawToken of tokens) {
        const token = normalizeTextToken(rawToken)
        if (!token) continue

        const marker = token.toLowerCase().replace(/[:\s]+/g, '')
        if (marker === 'question' || marker === 'intention' || marker === 'answer') {
            activeField = marker
            continue
        }

        if (activeField === 'question') {
            if (current.question) flushCurrent()
            current.question = token
            activeField = null
            continue
        }

        if (activeField === 'intention') {
            current.intention = token
            activeField = null
            continue
        }

        if (activeField === 'answer') {
            current.answer = token
            flushCurrent()
            continue
        }

        // Fallback when labels are missing: fill in sequence question -> intention -> answer.
        if (!current.question) {
            current.question = token
            continue
        }

        if (!current.intention) {
            current.intention = token
            continue
        }

        if (!current.answer) {
            current.answer = token
            flushCurrent()
            continue
        }

        flushCurrent()
        current.question = token
    }

    flushCurrent()
    return rows
}

function normalizeQuestionItems(value, defaultIntention){
    const rawItems = toArray(value)
    const normalizedRows = []
    const labeledTokens = []

    for (const item of rawItems) {
        if (typeof item === 'string') {
            labeledTokens.push(item)
            continue
        }

        const question = normalizeTextToken(item?.question)
        const intention = normalizeTextToken(item?.intention) || defaultIntention
        const answer = normalizeTextToken(item?.answer) || 'Explain your approach clearly with a concrete example.'

        if (question) {
            normalizedRows.push({ question, intention, answer })
            continue
        }

        // Some malformed outputs come as single-key objects: { question: 'question' } etc.
        for (const key of ['question', 'intention', 'answer']) {
            if (typeof item?.[key] === 'string') {
                labeledTokens.push(key)
                labeledTokens.push(item[key])
            }
        }
    }

    return [...normalizedRows, ...parseLabeledQuestionTokens(labeledTokens, defaultIntention)]
}

function normalizeSkillGaps(value){
    return toArray(value).map((item)=>{
        if (typeof item === 'string') {
            return {
                skill:item,
                severity:'medium'
            }
        }

        return {
            skill:item?.skill || '',
            severity:['low','medium','high'].includes(item?.severity) ? item.severity : 'medium'
        }
    }).filter(item => item.skill)
}

function normalizePreparationPlan(value){
    return toArray(value).map((item, index)=>{
        if (typeof item === 'string') {
            const dayMatch = item.match(/day\s*(\d+)/i)
            const day = dayMatch ? Number(dayMatch[1]) : index + 1
            const focus = item.replace(/day\s*\d+\s*:\s*/i, '').trim() || `Preparation day ${day}`

            return {
                day,
                focus,
                tasks:[
                    'Review key concepts for the focus area',
                    'Solve practice questions and summarize learnings'
                ]
            }
        }

        const day = Number(item?.day)
        return {
            day: Number.isFinite(day) ? day : index + 1,
            focus: item?.focus || `Preparation day ${index + 1}`,
            tasks: Array.isArray(item?.tasks) && item.tasks.length ? item.tasks : [
                'Review key concepts for the focus area',
                'Solve practice questions and summarize learnings'
            ]
        }
    })
}

async function generateInterviewReport(input={}){
    const { resume, selfDescription, jobDescription } = input
    const safeResume = typeof resume === 'string' ? resume.trim() : ''
    const safeSelfDescription = typeof selfDescription === 'string' ? selfDescription.trim() : ''
    const safeJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : ''

    if (!safeJobDescription || (!safeResume && !safeSelfDescription)) {
        throw new Error('jobDescription and at least one of resume/selfDescription are required')
    }

    const prompt=`Generate an interview report for a candidate with the following details.
IMPORTANT: Return valid JSON only and do not leave fields empty.
Include:
- matchScore as a number between 0 and 100
- at least 8 technicalQuestions
- at least 5 behavioralQuestions
- at least 4 skillGaps
- at least 7 preparationPlan days
Each question item must include question, intention, and answer.

Candidate details:
    Resume:${safeResume || 'Not provided'},
    Self Description:${safeSelfDescription || 'Not provided'},
    Job Description:${safeJobDescription}`

    try {
        const response = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
                model:'gemini-3-flash-preview',
                contents:prompt,
                config:{
                    responseMimeType:"application/json",
                    responseSchema:zodToJsonSchema(interviewReportSchema)
                }
            })
        })

        const parsed = JSON.parse(response.text)
        if (parsed && parsed.matchScore == null && parsed.matchscore != null) {
            parsed.matchScore = Number(parsed.matchscore)
        }

        if (parsed) {
            parsed.technicalQuestions = normalizeQuestionItems(
                parsed.technicalQuestions,
                'Assess technical depth and problem-solving approach'
            )
            parsed.behavioralQuestions = normalizeQuestionItems(
                parsed.behavioralQuestions,
                'Assess behavioral traits aligned with role expectations'
            )
            parsed.skillGaps = normalizeSkillGaps(parsed.skillGaps)
            parsed.preparationPlan = normalizePreparationPlan(parsed.preparationPlan)
        }

        console.log(parsed)
        return parsed
    } catch (error) {
        throw buildGeminiError(error, 'Failed to generate interview report. Please try again.')
    }
}
async function PdfFromHtml(htmlContent){

    function collectExecutableCandidates(rootDir) {
        if (!rootDir || !fs.existsSync(rootDir)) return []

        const candidates = []
        const executableNames = process.platform === 'win32'
            ? ['chrome.exe']
            : process.platform === 'darwin'
                ? ['Google Chrome for Testing', 'Chromium']
                : ['chrome', 'chromium']

        const stack = [rootDir]
        while (stack.length) {
            const currentDir = stack.pop()
            let entries = []
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true })
            } catch (_error) {
                continue
            }

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name)
                if (entry.isDirectory()) {
                    stack.push(fullPath)
                    continue
                }

                const fileName = entry.name
                if (executableNames.includes(fileName)) {
                    candidates.push(fullPath)
                }
            }
        }

        return candidates
    }

    function resolveInstalledChromePath(cacheDir) {
        const searchRoots = [
            cacheDir,
            process.env.PUPPETEER_CACHE_DIR,
            path.join(os.homedir(), '.cache', 'puppeteer')
        ].filter(Boolean)

        for (const root of searchRoots) {
            const candidates = collectExecutableCandidates(root)
            if (candidates.length) {
                return candidates[0]
            }
        }

        return ''
    }

    let browser
    try {
        const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.cache', 'puppeteer')
        process.env.PUPPETEER_CACHE_DIR = cacheDir
        fs.mkdirSync(cacheDir, { recursive: true })

        const launchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH
            if (fs.existsSync(configuredPath)) {
                launchOptions.executablePath = configuredPath
            } else {
                // Ignore stale/broken configured paths and fall back to Puppeteer's discovered executable.
                delete process.env.PUPPETEER_EXECUTABLE_PATH
            }
        }

        try {
            browser = await puppeteer.launch(launchOptions)
        } catch (launchError) {
            const launchMessage = launchError?.message || ''
            const missingBrowser =
                launchMessage.includes('Could not find Chrome') ||
                launchMessage.includes('Browser was not found at the configured executablePath')

            if (!missingBrowser) {
                throw launchError
            }

            // Self-heal on platforms where browser cache is not preserved between build/runtime.
            execSync(`npx puppeteer browsers install chrome --path "${cacheDir}"`, {
                stdio: 'inherit',
                env: process.env
            })

            let resolvedPath = ''
            try {
                resolvedPath = puppeteer.executablePath()
            } catch (_error) {
                resolvedPath = ''
            }

            if (!resolvedPath || !fs.existsSync(resolvedPath)) {
                resolvedPath = resolveInstalledChromePath(cacheDir)
            }

            if (resolvedPath && fs.existsSync(resolvedPath)) {
                launchOptions.executablePath = resolvedPath
            } else {
                // One more install attempt without explicit path for hosts that use default cache.
                execSync('npx puppeteer browsers install chrome', {
                    stdio: 'inherit',
                    env: process.env
                })
                resolvedPath = ''
                try {
                    resolvedPath = puppeteer.executablePath()
                } catch (_error) {
                    resolvedPath = ''
                }

                if (!resolvedPath || !fs.existsSync(resolvedPath)) {
                    resolvedPath = resolveInstalledChromePath(cacheDir)
                }

                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    launchOptions.executablePath = resolvedPath
                } else {
                    throw new Error('Chrome install completed but executable path is still missing at runtime.')
                }
            }

            browser = await puppeteer.launch(launchOptions)
        }

        const page = await browser.newPage()
        await page.setContent(htmlContent,{waitUntil:"networkidle0"})
        const pdfBuffer = await page.pdf({format:"A4",margin:{
            top:'20mm',
            bottom:'20mm',
            left:'15mm',
            right:'15mm'
        }})
        return pdfBuffer
    } catch (error) {
        const pdfError = new Error(`Unable to render PDF: ${error?.message || 'Unknown rendering error'}`)
        pdfError.statusCode = 500
        throw pdfError
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function buildLocalResumeHtml({ resume = '', selfDescription = '', jobDescription = '' }) {
    const safeResume = escapeHtml(resume || 'Not provided')
    const safeSelfDescription = escapeHtml(selfDescription || 'Not provided')
    const safeJobDescription = escapeHtml(jobDescription || 'Not provided')

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Generated Resume</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.4; margin: 0; padding: 28px; }
    h1 { margin: 0 0 10px 0; font-size: 26px; }
    h2 { margin: 22px 0 8px 0; font-size: 17px; color: #0e5a7a; }
    p { margin: 0 0 10px 0; white-space: pre-wrap; word-break: break-word; }
    .hint { color: #4b5563; font-size: 12px; margin-bottom: 14px; }
  </style>
</head>
<body>
  <h1>Resume</h1>
  <p class="hint">Generated from profile inputs</p>

  <h2>Profile Summary</h2>
  <p>${safeSelfDescription}</p>

  <h2>Experience and Skills</h2>
  <p>${safeResume}</p>

  <h2>Target Role</h2>
  <p>${safeJobDescription}</p>
</body>
</html>`
}

async function generateResumePdf({resume,selfDescription,jobDescription}){
   const safeResume = typeof resume === 'string' ? resume.trim() : ''
   const safeSelfDescription = typeof selfDescription === 'string' ? selfDescription.trim() : ''
   const safeJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : ''

   const resumepdfSchema=z.object({
     html:z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
   })
   const prompt=`Generate a resume for a candidate with the following details :
   Resume:${safeResume}
   Self Description:${safeSelfDescription}
   Job Description:${safeJobDescription}
   the response should be a JSON object with a single field "html" which contains a HTML content of the resume which can be converted to PDF using any library like puppeteer.
   The resume should be tailored for the given job Description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formated and structured, making it easy to read and visually appealing.
   The content of the resume should not sound like it's generated by AI and should be close as possible to a real human-written resume.
   You can highlight content using some colors or different styles but overall design should be simple and professional. 
   The content should be ATS friendly, i.e it should be easily parsable by ATS systems without losing important information.
   The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF.Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
   
   `

   let aiHtml = ''
   try {
       const response = await retryWithBackoff(async () => {
           return await ai.models.generateContent({
               model:"gemini-3-flash-preview",
               contents:prompt,
               config:{
                   responseMimeType:"application/json",
                   responseSchema:zodToJsonSchema(resumepdfSchema)
               }
           })
       }, 3, 1000)
       const jsonContent = JSON.parse(response.text)
       if (jsonContent?.html && typeof jsonContent.html === 'string') {
           aiHtml = jsonContent.html
       }
   } catch (error) {
       console.error('AI resume generation failed, using local fallback:', error?.message || error)
   }

   const htmlContent = aiHtml || buildLocalResumeHtml({
       resume: safeResume,
       selfDescription: safeSelfDescription,
       jobDescription: safeJobDescription
   })

   return PdfFromHtml(htmlContent)
}
module.exports={generateInterviewReport,generateResumePdf}
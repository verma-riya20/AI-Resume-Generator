const {GoogleGenAI}=require('@google/genai')
const { z } =require('zod')
const {zodToJsonSchema}=require('zod-to-json-schema')
const puppeteer=require('puppeteer')

const ai=new GoogleGenAI({
    apiKey:process.env.GOOGLE_GENAI_KEY
})

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
        const response=await ai.models.generateContent({
            model:'gemini-3-flash-preview',
            contents:prompt,
            config:{
                responseMimeType:"application/json",
                responseSchema:zodToJsonSchema(interviewReportSchema)
            }
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
        if (error && error.status === 429) {
            console.warn('Gemini quota exceeded (429). Retry after a short delay or upgrade billing limits.')
            return null
        }
        throw error
    }
}
async function PdfFromHtml(htmlContent){
    const browser=await puppeteer.launch()
    const page=await browser.newPage()
    await page.setContent(htmlContent,{waitUntil:"networkidle0"})
    const pdfBuffer=await page.pdf({format:"A4",margin:{
        top:'20mm',
        bottom:'20mm',
        left:'15mm',
        right:'15mm'
    }})
    await browser.close()
    return pdfBuffer

}

async function generateResumePdf({resume,selfDescription,jobDescription}){
   const resumepdfSchema=z.object({
     html:z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
   })
   const prompt=`Generate a resume for a candidate with the following details :
   Resume:${resume}
   Self Description:${selfDescription}
   Job Description:${jobDescription}
   the response should be a JSON object with a single field "html" which contains a HTML content of the resume which can be converted to PDF using any library like puppeteer.
   The resume should be tailored for the given job Description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formated and structured, making it easy to read and visually appealing.
   The content of the resume should not sound like it's generated by AI and should be close as possible to a real human-written resume.
   You can highlight content using some colors or different styles but overall design should be simple and professional. 
   The content should be ATS friendly, i.e it should be easily parsable by ATS systems without losing important information.
   The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF.Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
   
   `

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
       
       const jsonContent= JSON.parse(response.text)
       const pdfBuffer=await PdfFromHtml(jsonContent.html)
       return pdfBuffer
   } catch (error) {
       console.error('Gemini Resume PDF Error:', error)
       
       // Handle specific Gemini API errors
       if (error?.error?.code === 503 || error?.status === 'UNAVAILABLE') {
           const message = 'Gemini API is currently overloaded. Please try again in a moment.'
           console.error(message)
           throw new Error(message)
       }
       
       if (error?.error?.code === 429) {
           const message = 'Gemini quota exceeded. Please try again later or upgrade your plan.'
           console.warn(message)
           throw new Error(message)
       }
       
       if (error?.error?.code === 403 || error?.error?.code === 401) {
           const message = 'Authentication error with Gemini API. Please contact support.'
           console.error(message)
           throw new Error(message)
       }
       
       if (error?.error?.code === 400) {
           const message = 'Invalid request to Gemini API. Please check your input and try again.'
           console.error(message)
           throw new Error(message)
       }
       
       // Default error message
       const message = error?.error?.message || error?.message || 'Failed to generate resume PDF. Please try again.'
       console.error('Gemini Error:', message)
       throw new Error(message)
   }
}
module.exports={generateInterviewReport,generateResumePdf}
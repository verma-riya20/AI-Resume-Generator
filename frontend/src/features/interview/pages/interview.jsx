import React, { useEffect, useMemo, useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview'
import { useParams } from 'react-router'
import BackHomeArrow from '../../../components/BackHomeArrow'

const DEFAULT_ANSWER = 'Explain your approach clearly with a concrete example.'

const parseQuestionTokens = (tokens, defaultIntention) => {
  const rows = []
  let current = { question: '', intention: '', answer: '' }
  let activeField = null

  const flush = () => {
    const question = current.question.trim()
    if (!question) {
      current = { question: '', intention: '', answer: '' }
      activeField = null
      return
    }

    rows.push({
      question,
      intention: current.intention.trim() || defaultIntention,
      answer: current.answer.trim() || DEFAULT_ANSWER
    })

    current = { question: '', intention: '', answer: '' }
    activeField = null
  }

  for (const tokenValue of tokens) {
    const token = typeof tokenValue === 'string' ? tokenValue.trim() : ''
    if (!token) continue

    const marker = token.toLowerCase().replace(/[:\s]+/g, '')
    if (marker === 'question' || marker === 'intention' || marker === 'answer') {
      activeField = marker
      continue
    }

    if (activeField === 'question') {
      if (current.question) flush()
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
      flush()
      continue
    }

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
      flush()
      continue
    }
  }

  flush()
  return rows
}

const normalizeQuestionItemsForDisplay = (items, defaultIntention) => {
  if (!Array.isArray(items)) return []

  const markerRegex = /^(question|intention|answer)\s*:?\s*$/i
  const tokenStream = items
    .map((item) => (typeof item?.question === 'string' ? item.question.trim() : ''))
    .filter(Boolean)

  const hasLabeledTokens = tokenStream.some((token) => markerRegex.test(token))
  if (hasLabeledTokens) {
    return parseQuestionTokens(tokenStream, defaultIntention)
  }

  return items
    .map((item) => ({
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      intention:
        typeof item?.intention === 'string' && item.intention.trim()
          ? item.intention.trim()
          : defaultIntention,
      answer: typeof item?.answer === 'string' && item.answer.trim() ? item.answer.trim() : DEFAULT_ANSWER
    }))
    .filter((item) => item.question)
}

function Interview() {
  const { interviewId } = useParams()
  const [activeSection, setActiveSection] = useState('technical')
  const [openQuestionIndex, setOpenQuestionIndex] = useState(0)
  const { report, loading, getReportById,getResumePdf } = useInterview()

  const handleResumeDownload = async () => {
    try {
      await getResumePdf(interviewId)
    } catch (_error) {}
  }

  useEffect(() => {
    if (!interviewId) return
    if (report?._id === interviewId) return

    getReportById(interviewId).catch(() => {
      // Keep UI stable; errors can be surfaced with a dedicated toast/banner later.
    })
  }, [interviewId, report?._id])

  const data = report
  const sections = useMemo(
    () => [
      { key: 'technical', label: 'Technical questions' },
      { key: 'behavioral', label: 'Behavioral questions' },
      { key: 'roadmap', label: 'Road Map' }
    ],
    []
  )

  const content = useMemo(() => {
    if (activeSection === 'technical') {
      return {
        title: 'Technical Questions',
        items: normalizeQuestionItemsForDisplay(
          data?.technicalQuestions,
          'Assess technical depth and problem-solving approach'
        )
      }
    }

    if (activeSection === 'behavioral') {
      return {
        title: 'Behavioral Questions',
        items: normalizeQuestionItemsForDisplay(
          data?.behavioralQuestions,
          'Assess behavioral traits aligned with role expectations'
        )
      }
    }

    return {
      title: 'Preparation Road Map',
      items: data?.preparationPlan || []
    }
  }, [activeSection, data])

  const getGapTone = (severity, index) => {
    if (severity === 'high') return 'high'
    if (severity === 'low') return 'low'
    return ['high', 'mid', 'mid', 'low'][index % 4]
  }

  const getSectionIcon = (key) => {
    if (key === 'technical') {
      return (
        <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
          <path d="m10.6 12 3.7-3.7L13 7l-5 5 5 5 1.3-1.3-3.7-3.7h8.4v-2h-8.4Z" />
        </svg>
      )
    }

    if (key === 'behavioral') {
      return (
        <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
          <path d="M4 6h16v12H4V6Zm2 2v8h12V8H6Zm2 1h8v2H8V9Zm0 3h5v2H8v-2Z" />
        </svg>
      )
    }

    return (
      <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
        <path d="M5 12.5 17 5l-3.4 14-3-4.5L5 12.5Zm6.4-.1 1.5 2.2 1.8-7.4-6.4 4 3.1 1.2Z" />
      </svg>
    )
  }

  const questionCount = content.items.length
  const countLabel = activeSection === 'roadmap' ? `${questionCount}-day plan` : `${questionCount} questions`

  if (loading && !data) {
    return (
      <main className="interview-page">
        <BackHomeArrow />
        <section className="interview-shell" aria-label="Interview report">
          <p>Loading interview report...</p>
        </section>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="interview-page">
        <BackHomeArrow />
        <section className="interview-shell" aria-label="Interview report">
          <p>Interview report not found.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="interview-page">
      <BackHomeArrow />
      <section className="interview-shell" aria-label="Interview report">
        <aside className="left-nav" aria-label="Interview sections">
          <p className="nav-label">Sections</p>
          <button onClick={handleResumeDownload} className='button primary-button'>
            <svg height={"0.8rem"} style={{marginRight:"0.8rem"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6144 17.7956C10.277 18.5682 9.20776 18.5682 8.8704 17.7956L7.99275 15.7854C7.21171 13.9966 5.80589 12.5726 4.0523 11.7942L1.63658 10.7219C.868536 10.381.868537 9.26368 1.63658 8.92276L3.97685 7.88394C5.77553 7.08552 7.20657 5.60881 7.97427 3.75892L8.8633 1.61673C9.19319.821767 10.2916.821765 10.6215 1.61673L11.5105 3.75894C12.2782 5.60881 13.7092 7.08552 15.5079 7.88394L17.8482 8.92276C18.6162 9.26368 18.6162 10.381 17.8482 10.7219L15.4325 11.7942C13.6789 12.5726 12.2731 13.9966 11.492 15.7854L10.6144 17.7956ZM4.53956 9.82234C6.8254 10.837 8.68402 12.5048 9.74238 14.7996 10.8008 12.5048 12.6594 10.837 14.9452 9.82234 12.6321 8.79557 10.7676 7.04647 9.74239 4.71088 8.71719 7.04648 6.85267 8.79557 4.53956 9.82234ZM19.4014 22.6899 19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899ZM18.3745 19.0469 18.937 18.4883 19.4878 19.0469 18.937 19.5898 18.3745 19.0469Z"></path></svg>
            Download Resume
          </button>
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={activeSection === section.key ? 'nav-item active' : 'nav-item'}
            >
              <span className="nav-icon">{getSectionIcon(section.key)}</span>
              {section.label}
            </button>
          ))}
        </aside>

        <section className="main-content" aria-live="polite">
          <header className="content-head">
            <div className="head-main">
              <h2>{content.title}</h2>
              <span className="count-badge">{countLabel}</span>
            </div>
          </header>

          <div className="content-body">
            {activeSection !== 'roadmap' &&
              content.items.map((item, index) => (
                <article className="question-card" key={`${item.question}-${index}`}>
                  <button
                    type="button"
                    className="question-row"
                    onClick={() => setOpenQuestionIndex(openQuestionIndex === index ? null : index)}
                  >
                    <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
                    <p className="card-title">{item.question}</p>
                    <span className={openQuestionIndex === index ? 'chevron open' : 'chevron'} aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M7 10.5 12 15l5-4.5L15.6 9 12 12.2 8.4 9 7 10.5Z" />
                      </svg>
                    </span>
                  </button>

                  {openQuestionIndex === index && (
                    <div className="question-details show">
                      <p className="meta-pill">Intention</p>
                      <p className="card-meta">{item.intention}</p>
                      <p className="answer-pill">Model Answer</p>
                      <p className="card-answer">{item.answer}</p>
                    </div>
                  )}
                </article>
              ))}

            {activeSection === 'roadmap' && (
              <div className="roadmap-list">
                {content.items.map((item) => (
                  <article className="roadmap-item" key={item.day}>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div className="roadmap-content">
                      <p className="roadmap-day">Day {item.day}</p>
                      <p className="roadmap-focus">{item.focus}</p>
                      <ul className="roadmap-tasks">
                        {(item.tasks || []).map((task, idx) => (
                          <li key={`${task}-${idx}`}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="right-panel" aria-label="Skill gaps and score">
          <div className="score-box">
            <p>Match Score</p>
            <div className="score-ring" style={{ '--score': `${data?.matchScore ?? 0}` }}>
              <strong>{data?.matchScore ?? 0}</strong>
              <small>%</small>
            </div>
            <span className="score-note">Strong match for this role</span>
          </div>

          <div className="gaps-box">
            <h3>Skill Gaps</h3>
            <div className="gap-tags">
              {(data?.skillGaps || []).map((gap, index) => (
                <span className={`gap-tag ${getGapTone(gap.severity, index)}`} key={`${gap.skill}-${index}`}>
                  {gap.skill}
                </span>
              ))}
            </div>
          </div>

          <div className="preview-tile" aria-hidden="true" />
        </aside>
      </section>
    </main>
  )
}

export default Interview
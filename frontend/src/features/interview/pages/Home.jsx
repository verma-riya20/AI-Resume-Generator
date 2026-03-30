import React from 'react'
import "../style/home.scss"
import { useState,useRef,useEffect } from 'react'
import { useInterview } from '../hooks/useInterview'
import { useNavigate } from 'react-router'
import BackHomeArrow from '../../../components/BackHomeArrow'
import { toast } from 'react-toastify'
import { useAuth } from '../../auth/hooks/useAuth'

function Home() {
  const {loading,generateReport,reports,getReports}=useInterview()
    const { handleLogout } = useAuth()
    const [jobDescription,setJobDescription]=useState("")
    const [selfDescription,setSelfDescription]=useState("")
    const [uploadedFile, setUploadedFile] = useState(null)
    const resumeInputref=useRef()
    const navigate=useNavigate()

    useEffect(() => {
      getReports()
    }, [])

    const handleFileUpload = (e) => {
      const file = e.target.files[0]
      if (file) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        const maxSizeInBytes = 3 * 1024 * 1024

        if (!isPdf) {
          toast.error('Only PDF resumes are supported.')
          e.target.value = ''
          setUploadedFile(null)
          return
        }

        if (file.size > maxSizeInBytes) {
          toast.error('Resume file size must be 3MB or less.')
          e.target.value = ''
          setUploadedFile(null)
          return
        }

        setUploadedFile(file.name)
      }
    }

    const handleGenerateReport=async()=>{
        const loadingToastId = toast.loading('Generating your interview strategy...')
        try {
            const resumeFile=resumeInputref.current.files[0]
            const response=await generateReport({jobDescription,selfDescription,resumeFile})
            const generatedReport=response?.interviewReport
            toast.update(loadingToastId, {
              render: 'Interview strategy generated successfully!',
              type: 'success',
              isLoading: false,
              autoClose: 2500,
              closeOnClick: true,
            })

            if (response?.resumeParsingFailed) {
              toast.warning('Your PDF was uploaded, but text extraction failed. The report was generated without resume text.')
            }

            if (generatedReport?._id) {
              navigate(`/interview/${generatedReport._id}`)
            }
        } catch (error) {
            const errorMsg = error?.message || "Failed to generate interview report"
            toast.update(loadingToastId, {
              render: errorMsg,
              type: 'error',
              isLoading: false,
              autoClose: 3500,
              closeOnClick: true,
            })
            console.error("Report generation error:", error)
        }
    }

    const handleLogoutClick = async () => {
      try {
        await handleLogout()
      } finally {
        navigate('/login')
      }
    }

    return (
         <main className="home">
      <BackHomeArrow />
      <div className="logout-fab">
        <button type="button" onClick={handleLogoutClick} className="logout-button">
          Logout
        </button>
      </div>
      <section className="plan-card" aria-label="Create interview plan">
        <header className="plan-header">
          <h1>
            Create Your Custom <span>Interview Plan</span>
          </h1>
          <p>
            Let our AI analyze the job requirements and your unique profile to build
            a winning strategy.
          </p>
          <span className="header-dot" aria-hidden="true" />
        </header>

        <div className="plan-grid">
          <article className="panel left-panel">
            <label htmlFor="jobDescription" className="panel-title">
              <span className="title-indicator" aria-hidden="true" />
              Target Job Description
              <small>Required</small>
            </label>

            <textarea
              onChange={(e)=>setJobDescription(e.target.value)}
              id="jobDescription"
              name="jobDescription"
              maxLength={2000}
              placeholder="Paste the full job description here... e.g. Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design..."
            />

            <p className="meta">{jobDescription.length} / 2000 chars</p>
          </article>

          <article className="panel right-panel">
            <h2 className="panel-title">
              <span className="title-indicator" aria-hidden="true" />
              Your Profile
            </h2>

            <div className="field-group">
              <p className="field-label">
                Upload Resume <small>Most Reliable</small>
              </p>
              <label className={`dropzone ${uploadedFile ? 'uploaded' : ''}`} htmlFor="resume">
                {uploadedFile ? (
                  <div className="upload-success">
                    <span className="success-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    </span>
                    <strong>{uploadedFile}</strong>
                    <small>Uploaded successfully</small>
                  </div>
                ) : (
                  <>
                    <span className="upload-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M12 3a5 5 0 0 0-5 5v.4A4.6 4.6 0 0 0 2.5 13 4.5 4.5 0 0 0 7 17.5h10a4.5 4.5 0 0 0 .5-8.97A5.5 5.5 0 0 0 12 3Zm0 4.2 3.2 3.3-1.4 1.4-1.3-1.4V14h-2v-3.5l-1.3 1.4-1.4-1.4L12 7.2Z" />
                      </svg>
                    </span>
                    <strong>Click to upload or drag and drop</strong>
                    <small>PDF only, Max 3MB</small>
                  </>
                )}
              </label>
              <input ref={resumeInputref} hidden type="file" id="resume" name="resume" accept=".pdf,application/pdf" onChange={handleFileUpload} />
            </div>

            <div className="field-group">
              <label htmlFor="selfDescription" className="field-label">Quick Self-Description</label>
              <textarea
                onChange={(e)=>{setSelfDescription(e.target.value)}}
                id="selfDescription"
                name="selfDescription"
                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
              />
            </div>

            <p className="helper-note">
              Add both resume and self description for better results.
            </p>

            <button onClick={handleGenerateReport} type="button" className="cta-button" disabled={loading}>
              {loading ? 'Generating...' : 'Generate My Interview Strategy'}
            </button>
          </article>
        </div>
        {
          reports.length>0 && (
            <section className='recent-reports'>
              <h2>My Recent Interview Plans</h2>
              <ul className='reports-list'>
                {reports.map(report=>(
                  <li key={report._id} className='report-item' onClick={()=>navigate(`/interview/${report._id}`)}>
                    <h3>{report.title || report.positionName || report.role || 'Untitled Position'}</h3>
                    <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                    <p className={`match-score ${report.matchScore >= 80 ? 'high' : report.matchScore >= 60 ? 'medium' : 'low'}`}>
                      Match Score: {report.matchScore ?? 0}%
                    </p>
                  </li>
                ))}</ul>
            </section>
          )
        }
      </section>
    </main>
    )
}

export default Home
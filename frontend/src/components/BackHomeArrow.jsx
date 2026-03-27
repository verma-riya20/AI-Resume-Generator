import React from 'react'
import { Link } from 'react-router'
import './back-home-arrow.scss'

function BackHomeArrow() {
  return (
    <Link to="/" className="back-home-arrow" aria-label="Back to home">
      <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
        <path d="M14.7 6.3 9 12l5.7 5.7-1.4 1.4L6.2 12l7.1-7.1 1.4 1.4Z" />
      </svg>
      <span>Home</span>
    </Link>
  )
}

export default BackHomeArrow

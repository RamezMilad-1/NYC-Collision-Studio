import React from 'react';
import { AUTHOR_CONTACT } from '../authorContact';

export function Footer() {
  const { email, linkedInUrl, githubUrl } = AUTHOR_CONTACT;

  return (
    <React.Fragment>
      <footer className="footer">
        <div className="shell footer-stack">
          <div className="footer-inner">
            <div className="footer-meta">
              <strong>NYC Collision Studio</strong> · An interactive snapshot of NYC Open Data ·{' '}
              {new Date().getFullYear()}
            </div>
            <div className="footer-links">
              <a
                href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95"
                target="_blank"
                rel="noopener noreferrer"
              >
                Crashes dataset
              </a>
              <a
                href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Person/f55k-p6yu"
                target="_blank"
                rel="noopener noreferrer"
              >
                Persons dataset
              </a>
              <a href="https://opendata.cityofnewyork.us/" target="_blank" rel="noopener noreferrer">
                NYC Open Data
              </a>
            </div>
          </div>

          <div className="footer-about" aria-label="About">
            <span className="footer-about-title">About</span>
            <div className="footer-links footer-about-links">
              <a href={`mailto:${email}`}>{email}</a>
              <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
              <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </React.Fragment>
  );
}

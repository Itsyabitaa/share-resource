import React from 'react'
import BrandMark from './BrandMark'

export default function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer className="footer">
            <div className="footer-content">
                <BrandMark size={22} />
                <p>Write, share, and keep markdown in one nest.</p>
                <p>
                    © {year} md-nest · Made by{' '}
                    <a
                        href="https://github.com/Itsyabitaa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        Dev Kukusha
                    </a>
                    {' · '}
                    <a
                        href="https://github.com/Itsyabitaa/share-resource"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        GitHub
                    </a>
                </p>
            </div>
        </footer>
    )
}

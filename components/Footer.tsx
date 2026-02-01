import React from 'react'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p>
                    Made with ❤️ by{' '}
                    <a
                        href="https://github.com/Itsyabitaa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        Dev Kukusha
                    </a>
                </p>
                <p className="footer-repo">
                    <a
                        href="https://github.com/Itsyabitaa/share-resource"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        View on GitHub
                    </a>
                </p>
            </div>
        </footer>
    )
}

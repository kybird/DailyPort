'use client'

import { useEffect, useState } from 'react'

export function DevLoginShortcut() {
    const [isDev, setIsDev] = useState(false)

    useEffect(() => {
        // Only enable in development
        if (process.env.NODE_ENV === 'development') {
            setIsDev(true)
        }
    }, [])

    if (!isDev) return null

    const handleFill = () => {
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
        const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement

        if (emailInput && passwordInput) {
            // These would be set via .env.local locally
            emailInput.value = process.env.NEXT_PUBLIC_DEV_EMAIL || ''
            passwordInput.value = process.env.NEXT_PUBLIC_DEV_PASSWORD || ''

            // Trigger change events for React/Next.js to detect the values if necessary
            emailInput.dispatchEvent(new Event('input', { bubbles: true }))
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }

    return (
        <div
            onClick={handleFill}
            style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                width: '10px',
                height: '10px',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 9999,
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
            title="Dev Magic"
        />
    )
}

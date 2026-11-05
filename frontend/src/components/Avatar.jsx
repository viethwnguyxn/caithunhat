import { useState } from 'react'
import brandMark from '../assets/lapulga-mark.svg'

export default function Avatar({ src, alt = '', ...props }) {
  const [failedSrc, setFailedSrc] = useState('')
  const hasSource = Boolean(src) && src !== failedSrc

  return (
    <img
      {...props}
      src={hasSource ? src : brandMark}
      alt={alt}
      onError={() => {
        if (hasSource) setFailedSrc(src)
      }}
    />
  )
}

import { permanentRedirect } from 'next/navigation'

/**
 * Redirect 308 /contact → /#contact (SEO : redirection permanente)
 */
export default function ContactRedirect() {
  permanentRedirect('/#contact')
}
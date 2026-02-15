import { redirect } from 'next/navigation'

/**
 * Redirect /contact → /#contact (single-page navigation)
 */
export default function ContactRedirect() {
  redirect('/#contact')
}
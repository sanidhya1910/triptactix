import { Big_Shoulders, Hanken_Grotesk } from 'next/font/google'

export const plannerDisplay = Big_Shoulders({
  subsets: ['latin'],
  variable: '--font-big-shoulders',
  display: 'swap',
})

export const plannerSans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
})

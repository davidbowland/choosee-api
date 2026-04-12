import axios from 'axios'

import { recaptchaSecretKey } from '../config'

const google = axios.create({
  baseURL: 'https://www.google.com/',
})

export const getCaptchaScore = async (token: string): Promise<number> =>
  google
    .post(
      'recaptcha/api/siteverify',
      {},
      {
        params: {
          response: token,
          secret: recaptchaSecretKey,
        },
      },
    )
    .then((response) => {
      const score = response.data.score
      if (typeof score !== 'number') {
        throw new Error('reCAPTCHA response missing score')
      }
      return score
    })

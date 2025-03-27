import axios from 'axios'
import axiosRetry from 'axios-retry'

// Axios

axiosRetry(axios, { retries: 3 })

// Cognito

export const userPoolId = process.env.USER_POOL_ID as string

// Choices

export const choiceidMaxLength = parseInt(process.env.ID_MAX_LENGTH as string, 10)
export const choiceidMinLength = parseInt(process.env.ID_MIN_LENGTH as string, 10)

// DynamoDB

export const dynamodbChoicesTable = process.env.DYNAMODB_CHOICES_TABLE_NAME as string
export const dynamodbDecisionsTableName = process.env.DYNAMODB_DECISIONS_TABLE_NAME as string
export const dynamodbSessionsTableName = process.env.DYNAMODB_SESSIONS_TABLE_NAME as string

export const decisionExpireHours = parseInt(process.env.DECISION_EXPIRE_HOURS as string, 10)
export const sessionExpireHours = parseInt(process.env.SESSION_EXPIRE_HOURS as string, 10)

// Google

export const googleApiKey = process.env.GOOGLE_API_KEY as string
export const googleImageCount = parseInt(process.env.GOOGLE_IMAGE_COUNT as string, 10)
export const googleImageMaxHeight = parseInt(process.env.GOOGLE_IMAGE_MAX_HEIGHT as string, 10)
export const googleImageMaxWidth = parseInt(process.env.GOOGLE_IMAGE_MAX_WIDTH as string, 10)
export const googleTimeoutMs = 2500

// ID generator

export const idMaxLength = parseInt(process.env.ID_MAX_LENGTH as string, 10)
export const idMinLength = parseInt(process.env.ID_MIN_LENGTH as string, 10)

// JsonPatch

export const mutateObjectOnJsonPatch = false
export const throwOnInvalidJsonPatch = true

// SMS Queue API

export const corsDomain = process.env.CORS_DOMAIN as string
export const smsApiKey = process.env.SMS_API_KEY as string
export const smsApiUrl = process.env.SMS_API_URL as string

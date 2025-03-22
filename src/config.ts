import axios from 'axios'
import axiosRetry from 'axios-retry'

// Axios

axiosRetry(axios, { retries: 3 })

// Cognito

export const userPoolId = process.env.USER_POOL_ID as string

// DynamoDB

export const dynamodbDecisionTableName = process.env.DYNAMODB_DECISION_TABLE_NAME as string
export const dynamodbSessionTableName = process.env.DYNAMODB_SESSION_TABLE_NAME as string

// JsonPatch

export const mutateObjectOnJsonPatch = false
export const throwOnInvalidJsonPatch = true

// Maps API

export const mapsApiKey = process.env.MAPS_API_KEY as string
export const mapsApiUrl = process.env.MAPS_API_URL as string

// Sessions

export const idMinLength = parseInt(process.env.ID_MIN_LENGTH as string, 10)
export const idMaxLength = parseInt(process.env.ID_MAX_LENGTH as string, 10)
export const sessionExpireHours = parseInt(process.env.SESSION_EXPIRE_HOURS as string, 10)

// SMS Queue API

export const corsDomain = process.env.CORS_DOMAIN as string
export const smsApiKey = process.env.SMS_API_KEY as string
export const smsApiUrl = process.env.SMS_API_URL as string

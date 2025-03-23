// Cognito

process.env.USER_POOL_ID = 'us-east-2_8765redfghuyt'

// DynamoDB

process.env.DYNAMODB_CHOICES_TABLE_NAME = 'choices-table'
process.env.DYNAMODB_DECISIONS_TABLE_NAME = 'decision-table'
process.env.DYNAMODB_SESSIONS_TABLE_NAME = 'session-table'

process.env.CHOICE_EXPIRE_HOURS = '30'
process.env.DECISION_EXPIRE_HOURS = '30'
process.env.SESSION_EXPIRE_HOURS = '30'

// Google

process.env.GOOGLE_API_KEY = '98uhjgr4rgh0ijhgthjk'
process.env.GOOGLE_IMAGE_COUNT = '5'
process.env.GOOGLE_IMAGE_MAX_HEIGHT = '300'
process.env.GOOGLE_IMAGE_MAX_WIDTH = '400'

// ID generator

process.env.ID_MAX_LENGTH = '4'
process.env.ID_MIN_LENGTH = '3'

// reCAPTCHA

process.env.RECAPTCHA_SECRET_KEY = 'ertyuiknbghj'

// SMS Queue API

process.env.CORS_DOMAIN = 'http://choosee.bowland.link'
process.env.SMS_API_KEY = '3edfgr4ertyjkijhg8'
process.env.SMS_API_URL = 'https://sms-api.dbowland.com/v1'

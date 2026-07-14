---
inclusion: always
---

# Technical Stack & Architecture

## Stack Overview
- **Frontend**: React 18 + Vite 7
- **Backend**: AWS Amplify Gen 2
- **Language**: TypeScript 5.9
- **UI**: React with minimal dependencies
- **Build Tool**: Vite for fast development and production builds

## AWS Services Integration

### Amazon Rekognition
**Used for**: Liveness detection and face comparison
- **Liveness Service**: Detects real human presence vs. photos/videos
- **Compare Faces**: Matches facial features between two images
- **Key Features**: 
  - Real-time analysis
  - High accuracy facial recognition
  - Anti-spoofing capabilities

### AWS Bedrock (Claude Sonnet 4.5 Multimodal)
**Used for**: OCR and structured document extraction
- **Document Processing**: Receives document images and returns structured JSON
- **Extracted Fields**: Name, ID number, expiration date, address, etc.
- **Advantages**:
  - Advanced multimodal understanding
  - Structured output format
  - Handles various document types (passports, licenses, IDs)

### AWS Amplify Gen 2
- **Authentication**: Amazon Cognito integration
- **API**: GraphQL with AWS AppSync
- **Database**: DynamoDB for real-time data
- **Deployment**: Simplified serverless deployment

## Technical Constraints & Decisions

### Environment-Based Configuration
- **Current State**: Tenant webhook URLs stored in environment variables
- **Future Consideration**: Database storage for scalability
- **Security Note**: Never hardcode tenant configurations in source code

### Security Restrictions
1. **Tenant Naming**: Avoid predictable identifiers like "company_id"
2. **URL Parameters**: Validate and sanitize all input parameters
3. **Webhook Security**: Implement signature verification for webhook responses
4. **CORS Configuration**: Properly configure for iframe embedding

### Performance Requirements
- **Mobile-First**: Optimize for mobile device performance
- **Response Time**: Target < 2 seconds for verification flows
- **Image Processing**: Compress images before sending to AWS services
- **Caching Strategy**: Consider caching tenant configurations

### Development Guidelines
1. **Type Safety**: Full TypeScript implementation
2. **Error Handling**: Comprehensive error boundaries and logging
3. **Testing Strategy**: Unit tests for core logic, integration tests for AWS services
4. **Monitoring**: Implement CloudWatch logging and metrics

## Deployment Considerations
- **Amplify Hosting**: Leverage Amplify for CI/CD
- **Environment Variables**: Separate dev/staging/production configurations
- **Service Limits**: Monitor AWS service usage and quotas
- **Cost Optimization**: Implement usage-based optimization strategies

## Future Technical Roadmap
1. **Database Integration**: Move tenant config from env vars to DynamoDB
2. **Analytics Dashboard**: Add tenant usage monitoring
3. **Multi-language Support**: Internationalization for global clients
4. **Advanced Security**: Add biometric data encryption at rest
import { EServerDefinition } from '../enums/server-definition.enum'

export interface ITestServerTypeDetails {
  port: number
  portSsl: number
  encrypted: boolean
  serverType: EServerDefinition
}

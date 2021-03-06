import Stepfunctions = require("aws-sdk/clients/stepfunctions")

interface SetUpOptions {
  // stepFunctionsPort?: string
  // lambdaPort?: string
  // redisPort?: string
  defaultSubnet?: string
}

interface RunOptions {
  executionTimeout?: number
  executionInterval?: number
}

interface CallStub {
  result?: any
  exception?: CallStubException
}
interface CallStubException {
  type: string
  message: string
}
interface CallStubs {
  [functionName: string]: Array<CallStub>
}
type Execution = {
  functionName: string
  payload: object
}

type Result = {
  executions: Array<Execution>
  stepFunctionExecution: Stepfunctions.Types.DescribeExecutionOutput
  stepFunctionHistory: Stepfunctions.Types.GetExecutionHistoryOutput
}


export default class TestRunner {
  setUp (options?: SetUpOptions): Promise<void>
  run(callStubs: CallStubs, stepFunctionDefinition: any, stepFunctionInput: any, options?: RunOptions): Promise<Result>
  cleanUp(): Promise<void>
  tearDown(): Promise<void>
}




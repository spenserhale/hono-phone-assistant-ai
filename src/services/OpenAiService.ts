import OpenAI from "openai";
import {ClientOptions} from "openai/src";
import {ChatCompletionCreateParamsBase as Params} from "openai/src/resources/chat/completions";
import {ChatCompletionMessageParam as Message} from "openai/src/resources/chat/completions";
export class OpenAiService {
  private params: Params;
  private openai: OpenAI;

  private messages: Message[] = [];

  constructor(client: ClientOptions, params: Partial<Params> = {}) {
    this.openai = new OpenAI(client);
    this.params = {...{model: 'gpt-4-1106-preview'}, ...params};
  }

  public addMessage(role: string, content: string): void {
    this.messages.push({ role, content });
  }

  public async makeResponse(input: string): Promise<string> {
    this.messages.push({ 'role': 'user', 'content': input });
    const completion = await this.openai.chat.completions.create({...this.params, messages: this.messages});

    this.messages.push({ 'role': 'assistant', 'content': completion.choices[0].message.content });
    console.log('openai', `User: ${input}`, `Assistant: ${completion.choices[0].message.content}`);

    return completion.choices[0].message.content || '';
  }
}
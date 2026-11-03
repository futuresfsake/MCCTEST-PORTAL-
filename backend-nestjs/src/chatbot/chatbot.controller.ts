import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // Public (landing page), so keep it tight to protect the API quota.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('ask')
  async askChatbot(@Body('query') query: string) {
    const reply = await this.chatbotService.generateResponse(query);
    return { reply };
  }
}

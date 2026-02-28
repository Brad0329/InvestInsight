import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../services/aiApi';

/**
 * AI 채팅 상태 관리 훅
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('claude');
  const messagesRef = useRef([]);

  const send = useCallback(
    async (userMessage, systemPrompt) => {
      const userMsg = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      };
      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages(updated);
      setLoading(true);
      setError(null);

      try {
        // aiApi에 보낼 메시지 형식: [{ role, content }]
        const apiMessages = updated.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await sendMessage(
          selectedModel,
          apiMessages,
          systemPrompt,
        );

        const assistantMsg = {
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        };
        const withResponse = [...messagesRef.current, assistantMsg];
        messagesRef.current = withResponse;
        setMessages(withResponse);
        return response;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [selectedModel],
  );

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    selectedModel,
    setSelectedModel,
    send,
    clearHistory,
  };
}

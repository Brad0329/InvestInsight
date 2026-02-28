import Markdown from 'react-markdown';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-lg bg-sky-500 text-white text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm leading-relaxed prose prose-sm prose-slate max-w-none">
        <Markdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="mb-2 pl-4 list-disc">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 pl-4 list-decimal">{children}</ol>
            ),
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            h3: ({ children }) => (
              <h3 className="font-semibold text-sm mt-3 mb-1">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="font-semibold text-sm mt-2 mb-1">{children}</h4>
            ),
          }}
        >
          {message.content}
        </Markdown>
      </div>
    </div>
  );
}

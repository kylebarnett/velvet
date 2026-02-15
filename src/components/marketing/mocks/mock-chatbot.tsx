"use client";

import { useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Send } from "lucide-react";

const USER_MESSAGE = "What's the average revenue growth across my portfolio?";
const AI_RESPONSE =
  "Based on your portfolio of 24 companies, the average revenue growth is +22% QoQ. Top performers are CloudHive (+45%) and GreenLoop (+31%).";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}

function useTypewriter(text: string, startDelay: number, speed = 20) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      const t = setTimeout(() => {
        setDisplayed(text);
        setDone(true);
      }, startDelay);
      return () => clearTimeout(t);
    }

    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [text, startDelay, speed, prefersReducedMotion]);

  return { displayed, done };
}

export function MockChatbot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const [showTyping, setShowTyping] = useState(false);
  const { displayed: aiText, done: aiDone } = useTypewriter(
    AI_RESPONSE,
    2200,
    18,
  );

  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => setShowTyping(true), 1200);
    return () => clearTimeout(t);
  }, [isInView]);

  const showAiText = isInView && aiText.length > 0;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="flex flex-col rounded-lg border border-border-default bg-card-bg"
    >
      {/* Chat messages */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* User message */}
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-xs text-white">
            {USER_MESSAGE}
          </div>
        </motion.div>

        {/* AI response */}
        <motion.div
          className="flex items-start gap-2"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 1.0 }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated">
            <Sparkles className="h-3 w-3 text-accent" />
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-bg-secondary px-3.5 py-2.5 text-xs leading-relaxed text-text-primary">
            {showAiText ? (
              <>
                {aiText}
                {!aiDone && (
                  <span className="ml-px inline-block h-3 w-px animate-pulse bg-text-primary" />
                )}
              </>
            ) : showTyping ? (
              <TypingDots />
            ) : (
              <span className="invisible">.</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Chat input */}
      <div className="border-t border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-2">
          <span className="flex-1 text-xs text-text-muted">
            Ask about your portfolio...
          </span>
          <Send className="h-3.5 w-3.5 text-text-muted" />
        </div>
      </div>
    </div>
  );
}

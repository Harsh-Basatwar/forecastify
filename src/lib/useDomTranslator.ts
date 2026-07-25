"use client";

import { useEffect, useRef } from "react";
import { LangCode } from "./translations";

export function useDomTranslator(lang: LangCode) {
  const queueRef = useRef<Map<Node, string>>(new Map());
  const processingRef = useRef(false);
  const originalTextMap = useRef<WeakMap<Node, string>>(new WeakMap());
  const translatedTextMap = useRef<WeakMap<Node, string>>(new WeakMap());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If language is English, revert to original text and stop observer
    if (lang === "en") {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        const original = originalTextMap.current.get(node);
        if (original && node.textContent !== original) {
          node.textContent = original;
        }
      }
      return;
    }

    const processQueue = async () => {
      if (queueRef.current.size === 0 || processingRef.current) return;
      processingRef.current = true;

      // Extract a batch
      const batch = new Map(queueRef.current);
      queueRef.current.clear();

      const jsonPayload: Record<string, string> = {};
      const nodeKeys: Node[] = [];

      let index = 0;
      for (const [node, text] of batch.entries()) {
        const key = `t_${index++}`;
        jsonPayload[key] = text;
        nodeKeys.push(node);
      }

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "en",
            to: lang,
            json: jsonPayload
          })
        });

        if (res.ok) {
          const data = await res.json();
          const translatedDict = data.trans || data.json || data;
          
          nodeKeys.forEach((node, i) => {
            const key = `t_${i}`;
            if (translatedDict[key] && document.body.contains(node)) {
              // mark as translated by us to avoid infinite loop when characterData fires
              translatedTextMap.current.set(node, translatedDict[key]);
              node.textContent = translatedDict[key];
            }
          });
        }
      } catch (err) {
        console.error("DOM translation failed", err);
      } finally {
        processingRef.current = false;
        if (queueRef.current.size > 0) {
          timeoutRef.current = setTimeout(processQueue, 500);
        }
      }
    };

    const queueNode = (node: Node, text: string) => {
      // Ignore empty or pure whitespace/number strings
      if (!text.trim() || !/[a-zA-Z]/.test(text)) return;
      
      // Save original
      if (!originalTextMap.current.has(node)) {
        originalTextMap.current.set(node, text);
      }

      queueRef.current.set(node, originalTextMap.current.get(node) || text);
      
      if (!timeoutRef.current || !processingRef.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(processQueue, 1000);
      }
    };

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') return;
        queueNode(node, node.textContent || "");
      } else {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
        let childNode;
        while ((childNode = walker.nextNode())) {
          if (childNode.parentElement?.tagName === 'SCRIPT' || childNode.parentElement?.tagName === 'STYLE') continue;
          queueNode(childNode, childNode.textContent || "");
        }
      }
    };

    // Initial pass
    processNode(document.body);

    // Observe changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => processNode(node));
        } else if (mutation.type === "characterData") {
          // If a text node changes natively (by React), we should re-translate it if needed
          const node = mutation.target;
          if (node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') return;
          
          const newText = node.textContent || "";
          const lastTranslated = translatedTextMap.current.get(node);
          
          // If the change was made by our translation logic, ignore it.
          if (newText === lastTranslated) return;
          
          // If React changed the text back to English or updated a variable, we update original map and queue it
          originalTextMap.current.set(node, newText);
          queueNode(node, newText);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [lang]);
}

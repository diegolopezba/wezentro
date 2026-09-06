import { useEffect } from "react";

/** Sets document title + meta description for the browser-only landing pages. */
export const useLandingSeo = (title: string, description: string) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== undefined) meta.content = prevDesc;
    };
  }, [title, description]);
};

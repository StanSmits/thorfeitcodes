import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ChangelogPage: React.FC = () => {
  const [changelog, setChangelog] = useState<string>("");

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const res = await fetch("/CHANGELOG.md");
        const text = await res.text();
        setChangelog(text);
      } catch {
        setChangelog("Kon de changelog niet laden.");
      }
    };

    fetchChangelog();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex justify-center items-start">
        <div className="max-w-4xl w-full mx-auto px-4 py-8">
          <div className="prose max-w-none bg-white p-6 rounded-lg shadow border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{changelog}</ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChangelogPage;

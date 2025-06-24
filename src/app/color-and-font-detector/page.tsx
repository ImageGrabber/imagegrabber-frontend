"use client";

import { useState } from "react";
import Notification from "@/components/Notification";
import DashboardLayout from "@/components/DashboardLayout";

interface NotificationState {
  isVisible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface DetectionResult {
  colors: string[];
  fonts: string[];
}

export default function ColorAndFontDetectorPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleDetect = async () => {
    if (!url) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: "URL is required",
        message: "Please enter a URL to detect colors and fonts.",
      });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/color-and-font-detector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to detect colors and fonts.");
      }

      const data: DetectionResult = await response.json();
      setResult(data);
      setNotification({
        isVisible: true,
        type: 'success',
        title: 'Detection Complete',
        message: `Found ${data.colors.length} colors and ${data.fonts.length} fonts.`,
      });
    } catch (error: any) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: "Detection Failed",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-white">Color Palette & Font Detector</h1>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col space-y-4 bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a website URL..."
              className="w-full rounded-lg border px-4 py-2 text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
            />
            <button
              onClick={handleDetect}
              disabled={isLoading}
              className="w-full rounded-full bg-blue-600 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? "Detecting..." : "Detect"}
            </button>
          </div>

          {result && (
            <div className="mt-8 space-y-6">
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">Detected Colors</h2>
                  <div className="flex flex-wrap gap-4">
                    {result.colors.map((color, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-800/80 p-2 rounded-md">
                        <div
                          className="w-8 h-8 rounded-full border border-gray-500"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-sm text-gray-200">{color}</span>
                      </div>
                    ))}
                  </div>
                  {result.colors.length === 0 && <p className="text-gray-400">No colors detected.</p>}
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">Detected Fonts</h2>
                  <ul className="space-y-2">
                    {result.fonts.map((font, index) => (
                      <li key={index} style={{ fontFamily: font }} className="bg-gray-800/80 p-3 rounded-md text-lg text-gray-200">
                        {font}
                      </li>
                    ))}
                  </ul>
                  {result.fonts.length === 0 && <p className="text-gray-400">No fonts detected.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
    </DashboardLayout>
  );
} 
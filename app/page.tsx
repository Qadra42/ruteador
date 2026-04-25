import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          🚛 Route Agent
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Intelligent agent for scrap collection in Montevideo
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">How does it work?</h2>
          <div className="space-y-4 text-left">
            <div className="flex items-start">
              <span className="text-2xl mr-3">💬</span>
              <div>
                <h3 className="font-semibold">Clients send orders via Telegram</h3>
                <p className="text-gray-600 text-sm">
                  The conversational agent takes orders automatically
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">📋</span>
              <div>
                <h3 className="font-semibold">Dashboard for the owner</h3>
                <p className="text-gray-600 text-sm">
                  View all pending orders in real-time
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🗺️</span>
              <div>
                <h3 className="font-semibold">Optimized route generation</h3>
                <p className="text-gray-600 text-sm">
                  Creates the best route with Google Maps and sends it to the driver
                </p>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
        >
          View Dashboard
        </Link>

        <div className="mt-8 text-sm text-gray-600">
          <p>Built with Next.js 15, Vercel AI SDK, and ChatSDK</p>
          <p className="mt-1">For Vercel's "Zero to Agent" hackathon</p>
        </div>
      </div>
    </div>
  );
}

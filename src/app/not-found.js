export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <p className="mt-3 text-2xl text-gray-600">Page Not Found</p>
        <a href="/" className="mt-6 text-blue-600 hover:underline">
          Return to Home
        </a>
      </main>
    </div>
  );
} 
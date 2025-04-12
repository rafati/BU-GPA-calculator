import Link from 'next/link';

export default function TestNavigation() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test Navigation</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">API Tests</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <Link 
                href="/api/disclaimer/test-endpoint" 
                className="text-blue-600 hover:underline"
              >
                Test Regular Disclaimer API
              </Link>
            </li>
            <li>
              <Link 
                href="/api/pdf-disclaimer/test-endpoint" 
                className="text-blue-600 hover:underline"
              >
                Test PDF Disclaimer API
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Component Tests</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <Link 
                href="/test-pdf" 
                className="text-blue-600 hover:underline"
              >
                Test PDF Generation with Disclaimer
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8">
        <Link 
          href="/" 
          className="text-blue-600 hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
} 
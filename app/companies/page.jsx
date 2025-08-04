export default function Companies() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
        <p className="text-gray-600 mt-2">Manage your company accounts and organizations</p>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Companies</h2>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
              Add Company
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-center py-8">No companies found. Add your first company to get started.</p>
        </div>
      </div>
    </div>
  )
} 
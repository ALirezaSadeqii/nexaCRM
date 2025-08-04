export default function Activities() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-600 mt-2">Track your tasks, calls, meetings, and other activities</p>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors">
              Add Activity
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-center py-8">No activities found. Add your first activity to start tracking your work.</p>
        </div>
      </div>
    </div>
  )
} 
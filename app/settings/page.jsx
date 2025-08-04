export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your CRM preferences and account settings</p>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-2">Profile Information</h3>
              <p className="text-gray-500">Manage your profile and account details</p>
            </div>
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-2">Preferences</h3>
              <p className="text-gray-500">Customize your CRM experience</p>
            </div>
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-2">Integrations</h3>
              <p className="text-gray-500">Connect with other tools and services</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
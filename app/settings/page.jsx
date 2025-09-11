"use client"

import { useEffect, useState } from 'react'
import supabase from '../config/supabaseClient'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState(null)

  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [subscription, setSubscription] = useState('')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        const user = data?.user
        if (!user) {
          if (isMounted) setLoading(false)
          return
        }
        const uid = user.id
        if (isMounted) setUserId(uid)

        // Load profile from public.users
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('full_name, phone_number, subscription')
          .eq('id', uid)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116: No rows found
          throw profileError
        }

        if (isMounted) {
          setEmail(user.email || '')
          setFullName(profile?.full_name || '')
          setPhoneNumber(profile?.phone_number || '')
          setSubscription(profile?.subscription || '')
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      if (!userId) throw new Error('Missing user id')
      const { error } = await supabase
        .from('users')
        .upsert({ id: userId, full_name: fullName || null, phone_number: phoneNumber || null }, { onConflict: 'id' })
      if (error) throw error
      showMessage('Profile updated')
    } catch (err) {
      console.error(err)
      showMessage('Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const [newPassword, setNewPassword] = useState('')
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      showMessage('Password must be at least 8 characters', 'error')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      showMessage('Password updated')
    } catch (err) {
      console.error(err)
      showMessage('Failed to update password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-gray-600">Loading settings…</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account information</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-md p-3 text-sm ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
        </div>
        <div className="p-6 space-y-10">
          {/* Profile */}
          <section>
            <h3 className="text-md font-medium text-gray-900 mb-4">Profile Information</h3>
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 shadow-sm focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-md border-gray-300 shadow-sm text-black focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                  className="w-full rounded-md border-gray-300 shadow-sm text-black focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              {subscription ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
                  <input
                    type="text"
                    value={subscription}
                    disabled
                    className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 shadow-sm focus:border-gray-400 focus:ring-gray-400"
                  />
                </div>
              ) : null}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className={`inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-white shadow-sm hover:bg-gray-800 ${savingProfile ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Security */}
          <section>
            <h3 className="text-md font-medium text-gray-900 mb-4">Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border-gray-300 shadow-sm text-black focus:border-gray-400 focus:ring-gray-400"
                />
                <button
                  type="submit"
                  disabled={changingPassword}
                  className={`inline-flex items-center rounded-md bg-white border px-4 py-2 text-gray-900 shadow-sm hover:bg-gray-50 ${changingPassword ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {changingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </section>
          {/* Only allowed fields are editable; others removed as requested */}
        </div>
      </div>
    </div>
  )
}
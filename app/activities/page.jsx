"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon
} from "@heroicons/react/24/outline"
import supabase from "../config/supabaseClient"

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formValues, setFormValues] = useState({
    type: "",
    notes: "",
    contact_id: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineValues, setInlineValues] = useState({ type: "", notes: "", contact_id: "" })
  const [quickAdd, setQuickAdd] = useState({ type: "", notes: "", contact_id: "" })

  const activityTypeOptions = [
    "Call",
    "Email",
    "Meeting",
    "Task",
    "Note",
    "Follow-up",
    "Proposal",
    "Demo",
    "Lunch",
    "Other"
  ]

  const filteredActivities = useMemo(() => {
    if (!searchTerm) return activities
    return activities.filter(activity => 
      activity.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [activities, searchTerm])

  const sortedActivities = useMemo(() => {
    const copied = [...filteredActivities]
    copied.sort((a, b) => {
      const valA = a[sort.key] ?? ""
      const valB = b[sort.key] ?? ""
      if (valA < valB) return sort.dir === "asc" ? -1 : 1
      if (valA > valB) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return copied
  }, [filteredActivities, sort])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedActivities.length / pageSize)), [sortedActivities.length, pageSize])
  const currentPage = Math.min(page, totalPages)
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sortedActivities.slice(start, end)
  }, [sortedActivities, currentPage, pageSize])

  const hasActivities = useMemo(() => (activities?.length || 0) > 0, [activities])

  useEffect(() => {
    let isActive = true
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const userId = userData?.user?.id
        if (!userId) {
          setActivities([])
          setContacts([])
          setMessage({ type: "error", text: "You must be signed in to view activities." })
          return
        }

        // Load activities with contact and company information
        const { data: activitiesData, error: activitiesError } = await supabase
          .from("activities")
          .select(`
            id, 
            type, 
            notes, 
            contact_id, 
            created_at,
            contacts(name, email, company_id, companies(name))
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (activitiesError) throw activitiesError

        // Transform the data to flatten the contact information
        const transformedActivities = (activitiesData || []).map(activity => ({
          ...activity,
          contact_name: activity.contacts?.name || "Unknown Contact",
          contact_email: activity.contacts?.email,
          contact_company: activity.contacts?.companies?.name || null
        }))

        // Load contacts for dropdown
        const { data: contactsData, error: contactsError } = await supabase
          .from("contacts")
          .select(`
            id, 
            name, 
            email, 
            company_id,
            companies(name)
          `)
          .eq("user_id", userId)
          .order("name", { ascending: true })

        if (contactsError) throw contactsError

        if (isActive) {
          setActivities(transformedActivities || [])
          setContacts(contactsData || [])
        }
      } catch (err) {
        console.error("Error loading activities:", err)
        if (isActive) setMessage({ type: "error", text: "Failed to load activities." })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      isActive = false
    }
  }, [])

  const openModal = () => {
    setFormValues({ type: "", notes: "", contact_id: "" })
    setMessage({ type: "", text: "" })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingActivity(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const refreshActivities = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select(`
          id, 
          type, 
          notes, 
          contact_id, 
          created_at,
          contacts(name, email, company_id, companies(name))
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (activitiesError) throw activitiesError

      const transformedActivities = (activitiesData || []).map(activity => ({
        ...activity,
        contact_name: activity.contacts?.name || "Unknown Contact",
        contact_email: activity.contacts?.email,
        contact_company: activity.contacts?.companies?.name || null
      }))

      setActivities(transformedActivities || [])
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Error refreshing activities:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: "", text: "" })
    try {
      const { type, notes, contact_id } = formValues

      if (!type) {
        setMessage({ type: "error", text: "Please provide an activity type." })
        return
      }

      if (!contact_id) {
        setMessage({ type: "error", text: "Please select a contact for this activity." })
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add activities." })
        return
      }

      if (editingActivity) {
        // Update existing activity
        const { error } = await supabase
          .from("activities")
          .update({
            type: type || null,
            notes: notes || null,
            contact_id: contact_id || null,
          })
          .eq("id", editingActivity.id)
          .eq("user_id", userId)

        if (error) throw error
        setMessage({ type: "success", text: "Activity updated successfully." })
      } else {
        // Insert new activity
        const { error } = await supabase.from("activities").insert([
          {
            type: type || null,
            notes: notes || null,
            contact_id: contact_id || null,
            user_id: userId,
          },
        ])

        if (error) throw error
        setMessage({ type: "success", text: "Activity added successfully." })
      }

      closeModal()
      await refreshActivities()
    } catch (err) {
      console.error("Error saving activity:", err)
      const friendly = err?.message || "Failed to save activity."
      setMessage({ type: "error", text: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (activity) => {
    setInlineEditId(activity.id)
    setInlineValues({
      type: activity.type || "",
      notes: activity.notes || "",
      contact_id: activity.contact_id || "",
    })
  }

  const handleDelete = async (activityId) => {
    if (!confirm("Are you sure you want to delete this activity?")) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", userId)

      if (error) throw error
      setMessage({ type: "success", text: "Activity deleted successfully." })
      await refreshActivities()
    } catch (err) {
      console.error("Error deleting activity:", err)
      setMessage({ type: "error", text: "Failed to delete activity." })
    }
  }

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      }
      return { key, dir: "asc" }
    })
  }

  const toggleSelectAllCurrentPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        paginatedActivities.forEach((a) => next.add(a.id))
      } else {
        paginatedActivities.forEach((a) => next.delete(a.id))
      }
      return next
    })
  }

  const toggleSelectRow = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected activity(ies)?`)) return
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from("activities")
        .delete()
        .in("id", ids)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Selected activities deleted." })
      await refreshActivities()
    } catch (err) {
      console.error("Error bulk deleting:", err)
      setMessage({ type: "error", text: "Failed to delete selected activities." })
    }
  }

  const handleInlineChange = (e) => {
    const { name, value } = e.target
    setInlineValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleInlineSave = async (id) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const { error } = await supabase
        .from("activities")
        .update({
          type: inlineValues.type || null,
          notes: inlineValues.notes || null,
          contact_id: inlineValues.contact_id || null,
        })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Activity updated." })
      setInlineEditId(null)
      await refreshActivities()
    } catch (err) {
      console.error("Inline save error:", err)
      setMessage({ type: "error", text: "Failed to update activity." })
    }
  }

  const handleInlineCancel = () => {
    setInlineEditId(null)
  }

  const handleQuickAddChange = (e) => {
    const { name, value } = e.target
    setQuickAdd((prev) => ({ ...prev, [name]: value }))
  }

  const handleQuickAdd = async () => {
    try {
      if (!quickAdd.type) {
        setMessage({ type: "error", text: "Please provide an activity type." })
        return
      }
      if (!quickAdd.contact_id) {
        setMessage({ type: "error", text: "Please select a contact for this activity." })
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add activities." })
        return
      }
      const { error } = await supabase.from("activities").insert([
        {
          type: quickAdd.type || null,
          notes: quickAdd.notes || null,
          contact_id: quickAdd.contact_id || null,
          user_id: userId,
        },
      ])
      if (error) throw error
      setMessage({ type: "success", text: "Activity added." })
      setQuickAdd({ type: "", notes: "", contact_id: "" })
      setPage(1)
      await refreshActivities()
    } catch (err) {
      console.error("Quick add error:", err)
      setMessage({ type: "error", text: "Failed to add activity." })
    }
  }

  const exportCSV = () => {
    const rows = [
      ["Type", "Notes", "Contact", "Created"],
      ...sortedActivities.map((a) => [
        a.type || "",
        a.notes || "",
        a.contact_name || "",
        a.created_at ? new Date(a.created_at).toISOString() : "",
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "activities.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "Call": return "bg-blue-100 text-blue-800"
      case "Email": return "bg-green-100 text-green-800"
      case "Meeting": return "bg-purple-100 text-purple-800"
      case "Task": return "bg-yellow-100 text-yellow-800"
      case "Note": return "bg-gray-100 text-gray-800"
      case "Follow-up": return "bg-orange-100 text-orange-800"
      case "Proposal": return "bg-indigo-100 text-indigo-800"
      case "Demo": return "bg-pink-100 text-pink-800"
      case "Lunch": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-600 mt-2">Track your tasks, calls, meetings, and other activities</p>
      </div>
      
      {message.text ? (
        <div
          className={`${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : message.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-gray-50 text-gray-800 border-gray-200"
          } border rounded-lg px-4 py-3 mb-6 flex items-center justify-between`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredActivities.length} of {activities.length} activities
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 text-black"
                />
              </div>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                title="Export CSV"
              >
                <DocumentArrowDownIcon className="h-4 w-4" /> Export
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <TrashIcon className="h-4 w-4" /> Delete selected ({selectedIds.size})
                </button>
              )}
              {/* Add Activity Button */}
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
              Add Activity
            </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick add bar */}
          <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                name="type"
                value={quickAdd.type}
                onChange={handleQuickAddChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Select Type</option>
                {activityTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                type="text"
                name="notes"
                value={quickAdd.notes}
                onChange={handleQuickAddChange}
                placeholder="Notes"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              <select
                name="contact_id"
                value={quickAdd.contact_id}
                onChange={handleQuickAddChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Select Contact</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.companies?.name ? `(${contact.companies.name})` : ''}
                  </option>
                ))}
              </select>
              <div className="flex md:justify-end">
                <button
                  onClick={handleQuickAdd}
                  className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  <PlusIcon className="h-4 w-4" /> Quick Add
                </button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-3 text-gray-500">Loading activities...</span>
            </div>
          ) : hasActivities ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={paginatedActivities.every((a) => selectedIds.has(a.id)) && paginatedActivities.length > 0}
                        onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                        className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                      />
                    </th>
                    {[
                      { key: "type", label: "Type" },
                      { key: "notes", label: "Notes" },
                      { key: "contact_name", label: "Contact" },
                      { key: "created_at", label: "Created" },
                    ].map((col) => (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 text-black hover:text-gray-700"
                        >
                          {col.label}
                          {sort.key === col.key ? (
                            sort.dir === "asc" ? (
                              <ArrowUpIcon className="h-3 w-3" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3" />
                            )
                          ) : null}
                        </button>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(activity.id)}
                          onChange={(e) => toggleSelectRow(activity.id, e.target.checked)}
                          className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                        />
                      </td>
                      {inlineEditId === activity.id ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <select
                              name="type"
                              value={inlineValues.type}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                            >
                              <option value="">Select Type</option>
                              {activityTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <textarea
                              name="notes"
                              value={inlineValues.notes}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                              rows="2"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <select
                              name="contact_id"
                              value={inlineValues.contact_id}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                            >
                              <option value="">Select Contact</option>
                              {contacts.map(contact => (
                                <option key={contact.id} value={contact.id}>
                                  {contact.name} {contact.companies?.name ? `(${contact.companies.name})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInlineSave(activity.id)}
                                className="text-green-600 hover:text-green-800 p-1 rounded"
                                title="Save"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={handleInlineCancel}
                                className="text-gray-600 hover:text-gray-800 p-1 rounded"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(activity.type)}`}>
                              {activity.type || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 max-w-xs">
                              {activity.notes ? (
                                <div className="whitespace-pre-wrap">{activity.notes}</div>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              <div className="font-medium">{activity.contact_name || "—"}</div>
                              {activity.contact_company && (
                                <div className="text-xs text-gray-500">{activity.contact_company}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(activity)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit activity"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(activity.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete activity"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, sortedActivities.length)} of {sortedActivities.length}
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-black"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-black">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-gray-300 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <span className="px-2 text-sm text-gray-700">Page {currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded border border-gray-300 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first activity to track your work.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                Add Your First Activity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingActivity ? "Edit Activity" : "Add New Activity"}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formValues.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-black"
                      required
                    >
                      <option value="">Select Activity Type</option>
                      {activityTypeOptions.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formValues.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-black"
                      placeholder="Enter activity notes"
                      rows="4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="contact_id"
                      value={formValues.contact_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-black"
                      required
                    >
                      <option value="">Select Contact</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} {contact.companies?.name ? `(${contact.companies.name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingActivity ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        {editingActivity ? "Update Activity" : "Add Activity"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formValues, setFormValues] = useState({
    title: "",
    amount: "",
    status: "",
    contact_id: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineValues, setInlineValues] = useState({ title: "", amount: "", status: "", contact_id: "" })
  const [quickAdd, setQuickAdd] = useState({ title: "", amount: "", status: "", contact_id: "" })

  const statusOptions = [
    "Lead",
    "Qualified",
    "Proposal",
    "Negotiation", 
    "Closed Won",
    "Closed Lost"
  ]

  const filteredDeals = useMemo(() => {
    if (!searchTerm) return deals
    return deals.filter(deal => 
      deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.amount?.toString().includes(searchTerm) ||
      deal.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [deals, searchTerm])

  const sortedDeals = useMemo(() => {
    const copied = [...filteredDeals]
    copied.sort((a, b) => {
      const valA = a[sort.key] ?? ""
      const valB = b[sort.key] ?? ""
      if (valA < valB) return sort.dir === "asc" ? -1 : 1
      if (valA > valB) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return copied
  }, [filteredDeals, sort])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedDeals.length / pageSize)), [sortedDeals.length, pageSize])
  const currentPage = Math.min(page, totalPages)
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sortedDeals.slice(start, end)
  }, [sortedDeals, currentPage, pageSize])

  const hasDeals = useMemo(() => (deals?.length || 0) > 0, [deals])

  useEffect(() => {
    let isActive = true
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const userId = userData?.user?.id
        if (!userId) {
          setDeals([])
          setContacts([])
          setMessage({ type: "error", text: "You must be signed in to view deals." })
          return
        }

        // Load deals with contact and company information
        const { data: dealsData, error: dealsError } = await supabase
          .from("deals")
          .select(`
            id, 
            title, 
            amount, 
            status, 
            contact_id, 
            created_at,
            contacts(name, email, company_id, companies(name))
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (dealsError) throw dealsError

        // Transform the data to flatten the contact information
        const transformedDeals = (dealsData || []).map(deal => ({
          ...deal,
          contact_name: deal.contacts?.name || "Unknown Contact",
          contact_email: deal.contacts?.email,
          contact_company: deal.contacts?.companies?.name || null
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
          setDeals(transformedDeals || [])
          setContacts(contactsData || [])
        }
      } catch (err) {
        console.error("Error loading deals:", err)
        if (isActive) setMessage({ type: "error", text: "Failed to load deals." })
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
    setFormValues({ title: "", amount: "", status: "", contact_id: "" })
    setMessage({ type: "", text: "" })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDeal(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const refreshDeals = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(`
          id, 
          title, 
          amount, 
          status, 
          contact_id, 
          created_at,
          contacts(name, email, company_id, companies(name))
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (dealsError) throw dealsError

      const transformedDeals = (dealsData || []).map(deal => ({
        ...deal,
        contact_name: deal.contacts?.name || "Unknown Contact",
        contact_email: deal.contacts?.email,
        contact_company: deal.contacts?.companies?.name || null
      }))

      setDeals(transformedDeals || [])
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Error refreshing deals:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: "", text: "" })
    try {
      const { title, amount, status, contact_id } = formValues

      if (!title) {
        setMessage({ type: "error", text: "Please provide a deal title." })
        return
      }

      if (!contact_id) {
        setMessage({ type: "error", text: "Please select a contact for this deal." })
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add deals." })
        return
      }

      if (editingDeal) {
        // Update existing deal
        const { error } = await supabase
          .from("deals")
          .update({
            title: title || null,
            amount: amount ? parseFloat(amount) : null,
            status: status || null,
            contact_id: contact_id || null,
          })
          .eq("id", editingDeal.id)
          .eq("user_id", userId)

        if (error) throw error
        setMessage({ type: "success", text: "Deal updated successfully." })
      } else {
        // Insert new deal
        const { error } = await supabase.from("deals").insert([
          {
            title: title || null,
            amount: amount ? parseFloat(amount) : null,
            status: status || null,
            contact_id: contact_id || null,
            user_id: userId,
          },
        ])

        if (error) throw error
        setMessage({ type: "success", text: "Deal added successfully." })
      }

      closeModal()
      await refreshDeals()
    } catch (err) {
      console.error("Error saving deal:", err)
      const friendly = err?.message || "Failed to save deal."
      setMessage({ type: "error", text: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (deal) => {
    setInlineEditId(deal.id)
    setInlineValues({
      title: deal.title || "",
      amount: deal.amount?.toString() || "",
      status: deal.status || "",
      contact_id: deal.contact_id || "",
    })
  }

  const handleDelete = async (dealId) => {
    if (!confirm("Are you sure you want to delete this deal?")) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId)
        .eq("user_id", userId)

      if (error) throw error
      setMessage({ type: "success", text: "Deal deleted successfully." })
      await refreshDeals()
    } catch (err) {
      console.error("Error deleting deal:", err)
      setMessage({ type: "error", text: "Failed to delete deal." })
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
        paginatedDeals.forEach((d) => next.add(d.id))
      } else {
        paginatedDeals.forEach((d) => next.delete(d.id))
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
    if (!confirm(`Delete ${selectedIds.size} selected deal(s)?`)) return
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from("deals")
        .delete()
        .in("id", ids)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Selected deals deleted." })
      await refreshDeals()
    } catch (err) {
      console.error("Error bulk deleting:", err)
      setMessage({ type: "error", text: "Failed to delete selected deals." })
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
        .from("deals")
        .update({
          title: inlineValues.title || null,
          amount: inlineValues.amount ? parseFloat(inlineValues.amount) : null,
          status: inlineValues.status || null,
          contact_id: inlineValues.contact_id || null,
        })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Deal updated." })
      setInlineEditId(null)
      await refreshDeals()
    } catch (err) {
      console.error("Inline save error:", err)
      setMessage({ type: "error", text: "Failed to update deal." })
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
      if (!quickAdd.title) {
        setMessage({ type: "error", text: "Please provide a deal title." })
        return
      }
      if (!quickAdd.contact_id) {
        setMessage({ type: "error", text: "Please select a contact for this deal." })
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add deals." })
        return
      }
      const { error } = await supabase.from("deals").insert([
        {
          title: quickAdd.title || null,
          amount: quickAdd.amount ? parseFloat(quickAdd.amount) : null,
          status: quickAdd.status || null,
          contact_id: quickAdd.contact_id || null,
          user_id: userId,
        },
      ])
      if (error) throw error
      setMessage({ type: "success", text: "Deal added." })
      setQuickAdd({ title: "", amount: "", status: "", contact_id: "" })
      setPage(1)
      await refreshDeals()
    } catch (err) {
      console.error("Quick add error:", err)
      setMessage({ type: "error", text: "Failed to add deal." })
    }
  }

  const exportCSV = () => {
    const rows = [
      ["Title", "Amount", "Status", "Contact", "Created"],
      ...sortedDeals.map((d) => [
        d.title || "",
        d.amount ? `$${d.amount.toLocaleString()}` : "",
        d.status || "",
        d.contact_name || "",
        d.created_at ? new Date(d.created_at).toISOString() : "",
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "deals.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatAmount = (amount) => {
    if (!amount) return "—"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Lead": return "bg-gray-100 text-gray-800"
      case "Qualified": return "bg-blue-100 text-blue-800"
      case "Proposal": return "bg-yellow-100 text-yellow-800"
      case "Negotiation": return "bg-orange-100 text-orange-800"
      case "Closed Won": return "bg-green-100 text-green-800"
      case "Closed Lost": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
        <p className="text-gray-600 mt-2">Track your sales pipeline and opportunities</p>
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
              <h2 className="text-xl font-semibold text-gray-900">Sales Pipeline</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredDeals.length} of {deals.length} deals
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full  text-black"
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
              {/* Add Deal Button */}
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
              Add Deal
            </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick add bar */}
          <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                name="title"
                value={quickAdd.title}
                onChange={handleQuickAddChange}
                placeholder="Deal Title"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              <input
                type="number"
                name="amount"
                value={quickAdd.amount}
                onChange={handleQuickAddChange}
                placeholder="Amount"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              <select
                name="status"
                value={quickAdd.status}
                onChange={handleQuickAddChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Select Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
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
                  className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <PlusIcon className="h-4 w-4" /> Quick Add
                </button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-500">Loading deals...</span>
            </div>
          ) : hasDeals ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={paginatedDeals.every((d) => selectedIds.has(d.id)) && paginatedDeals.length > 0}
                        onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded"
                      />
                    </th>
                    {[
                      { key: "title", label: "Title" },
                      { key: "amount", label: "Amount" },
                      { key: "status", label: "Status" },
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
                  {paginatedDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={(e) => toggleSelectRow(deal.id, e.target.checked)}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded"
                        />
                      </td>
                      {inlineEditId === deal.id ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              name="title"
                              value={inlineValues.title}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              name="amount"
                              value={inlineValues.amount}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <select
                              name="status"
                              value={inlineValues.status}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-black"
                            >
                              <option value="">Select Status</option>
                              {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
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
                            {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInlineSave(deal.id)}
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
                            <div className="text-sm font-medium text-gray-900">{deal.title || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-medium">
                              {formatAmount(deal.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deal.status)}`}>
                              {deal.status || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              <div className="font-medium">{deal.contact_name || "—"}</div>
                              {deal.contact_company && (
                                <div className="text-xs text-gray-500">{deal.contact_company}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(deal)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit deal"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(deal.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete deal"
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
                  {Math.min(currentPage * pageSize, sortedDeals.length)} of {sortedDeals.length}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="border border-gray-300 text-black rounded-lg px-2 py-1 text-sm"
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first deal to track your sales pipeline.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                Add Your First Deal
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
                    {editingDeal ? "Edit Deal" : "Add New Deal"}
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
                      Deal Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formValues.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-black"
                      placeholder="Enter deal title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formValues.amount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-black"
                      placeholder="Enter deal amount"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formValues.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-black"
                    >
                      <option value="">Select Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="contact_id"
                      value={formValues.contact_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-black"
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingDeal ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        {editingDeal ? "Update Deal" : "Add Deal"}
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
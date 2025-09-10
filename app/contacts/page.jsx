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

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    company_id: "",
    phone: "",
  })
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: "",
    industry: "",
    website: "",
    phone: "",
    address: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineValues, setInlineValues] = useState({ name: "", email: "", company_id: "", phone: "" })
  const [quickAdd, setQuickAdd] = useState({ name: "", email: "", company_id: "", phone: "" })

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [contacts, searchTerm])

  const sortedContacts = useMemo(() => {
    const copied = [...filteredContacts]
    copied.sort((a, b) => {
      const valA = a[sort.key] ?? ""
      const valB = b[sort.key] ?? ""
      if (valA < valB) return sort.dir === "asc" ? -1 : 1
      if (valA > valB) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return copied
  }, [filteredContacts, sort])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedContacts.length / pageSize)), [sortedContacts.length, pageSize])
  const currentPage = Math.min(page, totalPages)
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sortedContacts.slice(start, end)
  }, [sortedContacts, currentPage, pageSize])

  const hasContacts = useMemo(() => (contacts?.length || 0) > 0, [contacts])

  useEffect(() => {
    let isActive = true
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const userId = userData?.user?.id
        if (!userId) {
          setContacts([])
          setCompanies([])
          setMessage({ type: "error", text: "You must be signed in to view contacts." })
          return
        }

        // Load contacts with company information
        const { data: contactsData, error: contactsError } = await supabase
          .from("contacts")
          .select(`
            id, 
            name, 
            email, 
            company_id, 
            phone, 
            created_at,
            companies(name)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (contactsError) throw contactsError

        // Transform the data to flatten the company name
        const transformedContacts = contactsData?.map(contact => ({
          ...contact,
          company_name: contact.companies?.name || null
        })) || []

        // Load companies for dropdown
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("id, name")
          .eq("user_id", userId)
          .order("name", { ascending: true })

        if (companiesError) throw companiesError

        if (isActive) {
          setContacts(transformedContacts)
          setCompanies(companiesData || [])
        }
      } catch (err) {
        console.error("Error loading data:", err)
        if (isActive) setMessage({ type: "error", text: "Failed to load contacts." })
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
    setFormValues({ name: "", email: "", company_id: "", phone: "" })
    setShowNewCompanyForm(false)
    setNewCompanyForm({ name: "", industry: "", website: "", phone: "", address: "" })
    setMessage({ type: "", text: "" })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingContact(null)
    setShowNewCompanyForm(false)
    setNewCompanyForm({ name: "", industry: "", website: "", phone: "", address: "" })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleNewCompanyInputChange = (e) => {
    const { name, value } = e.target
    setNewCompanyForm((prev) => ({ ...prev, [name]: value }))
  }

  const refreshContacts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      
      // Load contacts with company information
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select(`
          id, 
          name, 
          email, 
          company_id, 
          phone, 
          created_at,
          companies(name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (contactsError) throw contactsError

      // Transform the data to flatten the company name
      const transformedContacts = contactsData?.map(contact => ({
        ...contact,
        company_name: contact.companies?.name || null
      })) || []

      setContacts(transformedContacts)
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Error refreshing contacts:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: "", text: "" })
    try {
      const { name, email, company_id, phone } = formValues

      if (!name && !email) {
        setMessage({ type: "error", text: "Please provide at least a name or an email." })
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add contacts." })
        return
      }

      let finalCompanyId = company_id

      // If creating a new company, create it first
      if (showNewCompanyForm && newCompanyForm.name) {
        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert([
            {
              name: newCompanyForm.name,
              industry: newCompanyForm.industry || null,
              website: newCompanyForm.website || null,
              phone: newCompanyForm.phone || null,
              address: newCompanyForm.address || null,
              user_id: userId,
            },
          ])
          .select()
          .single()

        if (companyError) throw companyError
        finalCompanyId = newCompany.id
        
        // Refresh companies list
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name")
          .eq("user_id", userId)
          .order("name", { ascending: true })
        setCompanies(companiesData || [])
      }

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update({
            name: name || null,
            email: email || null,
            company_id: finalCompanyId || null,
            phone: phone || null,
          })
          .eq("id", editingContact.id)
          .eq("user_id", userId)

        if (error) throw error
        setMessage({ type: "success", text: "Contact updated successfully." })
      } else {
        // Insert new contact
        const { error } = await supabase.from("contacts").insert([
          {
            name: name || null,
            email: email || null,
            company_id: finalCompanyId || null,
            phone: phone || null,
            user_id: userId,
          },
        ])

        if (error) throw error
        setMessage({ type: "success", text: "Contact added successfully." })
      }

      closeModal()
      await refreshContacts()
    } catch (err) {
      console.error("Error saving contact:", err)
      const friendly = err?.message || "Failed to save contact."
      setMessage({ type: "error", text: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (contact) => {
    setInlineEditId(contact.id)
    setInlineValues({
      name: contact.name || "",
      email: contact.email || "",
      company_id: contact.company_id || "",
      phone: contact.phone || "",
    })
  }

  const handleDelete = async (contactId) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId)

      if (error) throw error
      setMessage({ type: "success", text: "Contact deleted successfully." })
      await refreshContacts()
    } catch (err) {
      console.error("Error deleting contact:", err)
      setMessage({ type: "error", text: "Failed to delete contact." })
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
        paginatedContacts.forEach((c) => next.add(c.id))
      } else {
        paginatedContacts.forEach((c) => next.delete(c.id))
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
    if (!confirm(`Delete ${selectedIds.size} selected contact(s)?`)) return
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from("contacts")
        .delete()
        .in("id", ids)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Selected contacts deleted." })
      await refreshContacts()
    } catch (err) {
      console.error("Error bulk deleting:", err)
      setMessage({ type: "error", text: "Failed to delete selected contacts." })
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
        .from("contacts")
        .update({
          name: inlineValues.name || null,
          email: inlineValues.email || null,
          company_id: inlineValues.company_id || null,
          phone: inlineValues.phone || null,
        })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Contact updated." })
      setInlineEditId(null)
      await refreshContacts()
    } catch (err) {
      console.error("Inline save error:", err)
      setMessage({ type: "error", text: "Failed to update contact." })
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
      if (!quickAdd.name && !quickAdd.email) {
        setMessage({ type: "error", text: "Provide at least a name or an email." })
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add contacts." })
        return
      }
      const { error } = await supabase.from("contacts").insert([
        {
          name: quickAdd.name || null,
          email: quickAdd.email || null,
          company_id: quickAdd.company_id || null,
          phone: quickAdd.phone || null,
          user_id: userId,
        },
      ])
      if (error) throw error
      setMessage({ type: "success", text: "Contact added." })
      setQuickAdd({ name: "", email: "", company_id: "", phone: "" })
      setPage(1)
      await refreshContacts()
    } catch (err) {
      console.error("Quick add error:", err)
      setMessage({ type: "error", text: "Failed to add contact." })
    }
  }

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Company", "Phone", "Created"],
      ...sortedContacts.map((c) => [
        c.name || "",
        c.email || "",
        c.company_name || "",
        c.phone || "",
        c.created_at ? new Date(c.created_at).toISOString() : "",
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contacts.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contacts</h1>
        <p className="text-slate-600 mt-2">Manage your contacts and leads</p>
      </div>
      
      {message.text ? (
        <div
          className={`${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : message.type === "error"
              ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
              : "bg-slate-50 text-slate-800 ring-1 ring-slate-200"
          } rounded-xl px-4 py-3 mb-6 flex items-center justify-between shadow-sm`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-md ring-1 ring-black/5">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white/60 backdrop-blur-sm rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">All Contacts</h2>
              <p className="text-sm text-slate-500 mt-1">
                {filteredContacts.length} of {contacts.length} contacts
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full  text-black "
                />
              </div>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                title="Export CSV"
              >
                <DocumentArrowDownIcon className="h-4 w-4" /> Export
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                >
                  <TrashIcon className="h-4 w-4" /> Delete selected ({selectedIds.size})
                </button>
              )}
              {/* Add Contact Button */}
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
              Add Contact
            </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick add bar */}
          <div className="mb-4 bg-gradient-to-r from-slate-50 to-white p-4 rounded-xl border border-gray-200 ring-1 ring-black/5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                name="name"
                value={quickAdd.name}
                onChange={handleQuickAddChange}
                placeholder="Name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="email"
                name="email"
                value={quickAdd.email}
                onChange={handleQuickAddChange}
                placeholder="Email"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                name="company_id"
                value={quickAdd.company_id}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    // For quick add, we'll just show a message to use the full form for new companies
                    setMessage({ type: "info", text: "Please use the 'Add Contact' button to create a new company." })
                    setQuickAdd(prev => ({ ...prev, company_id: "" }))
                  } else {
                    setQuickAdd(prev => ({ ...prev, company_id: e.target.value }))
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Company</option>
                <option value="new">+ Create New Company (use Add Contact)</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="phone"
                value={quickAdd.phone}
                onChange={handleQuickAddChange}
                placeholder="Phone"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex md:justify-end">
                <button
                  onClick={handleQuickAdd}
                  className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  <PlusIcon className="h-4 w-4" /> Quick Add
                </button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-500">Loading contacts...</span>
            </div>
          ) : hasContacts ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={paginatedContacts.every((c) => selectedIds.has(c.id)) && paginatedContacts.length > 0}
                        onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    {[
                      { key: "name", label: "Name" },
                      { key: "email", label: "Email" },
                      { key: "company_name", label: "Company" },
                      { key: "phone", label: "Phone" },
                      { key: "created_at", label: "Created" },
                    ].map((col) => (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-slate-700"
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
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={(e) => toggleSelectRow(contact.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      {inlineEditId === contact.id ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              name="name"
                              value={inlineValues.name}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="email"
                              name="email"
                              value={inlineValues.email}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <select
                              name="company_id"
                              value={inlineValues.company_id}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="">Select Company</option>
                              {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                  {company.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              name="phone"
                              value={inlineValues.phone}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInlineSave(contact.id)}
                                className="text-emerald-600 hover:text-emerald-800 p-1 rounded"
                                title="Save"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={handleInlineCancel}
                                className="text-slate-600 hover:text-slate-800 p-1 rounded"
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
                            <div className="text-sm font-medium text-slate-900">{contact.name || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">
                              {contact.email ? (
                                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                                  {contact.email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">{contact.company_name || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">
                              {contact.phone ? (
                                <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                                  {contact.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-500">
                              {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(contact)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit contact"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="text-rose-600 hover:text-rose-800 p-1 rounded"
                                title="Delete contact"
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
                  {Math.min(currentPage * pageSize, sortedContacts.length)} of {sortedContacts.length}
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
                  <div className="flex text-black items-center gap-1">
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
              <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No contacts found</h3>
              <p className="text-slate-500 mb-6">
                Get started by adding your first contact to build your network.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Your First Contact
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
              <div className="absolute inset-0 bg-gray-500/70 backdrop-blur-sm" onClick={closeModal}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingContact ? "Edit Contact" : "Add New Contact"}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formValues.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formValues.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <select
                        name="company_id"
                        value={formValues.company_id}
                        onChange={(e) => {
                          if (e.target.value === "new") {
                            setShowNewCompanyForm(true)
                            setFormValues(prev => ({ ...prev, company_id: "" }))
                          } else {
                            setShowNewCompanyForm(false)
                            setFormValues(prev => ({ ...prev, company_id: e.target.value }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select Company</option>
                        <option value="new">+ Create New Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formValues.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  {/* New Company Form */}
                  {showNewCompanyForm && (
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Create New Company</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={newCompanyForm.name}
                            onChange={handleNewCompanyInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter company name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Industry
                          </label>
                          <input
                            type="text"
                            name="industry"
                            value={newCompanyForm.industry}
                            onChange={handleNewCompanyInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter industry"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Website
                            </label>
                            <input
                              type="url"
                              name="website"
                              value={newCompanyForm.website}
                              onChange={handleNewCompanyInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="https://example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Company Phone
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={newCompanyForm.phone}
                              onChange={handleNewCompanyInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Enter company phone"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={newCompanyForm.address}
                            onChange={handleNewCompanyInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter company address"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingContact ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        {editingContact ? "Update Contact" : "Add Contact"}
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
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

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formValues, setFormValues] = useState({
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
  const [inlineValues, setInlineValues] = useState({ name: "", industry: "", website: "", phone: "", address: "" })
  const [quickAdd, setQuickAdd] = useState({ name: "", industry: "", website: "", phone: "", address: "" })

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies
    return companies.filter(company => 
      company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [companies, searchTerm])

  const sortedCompanies = useMemo(() => {
    const copied = [...filteredCompanies]
    copied.sort((a, b) => {
      const valA = a[sort.key] ?? ""
      const valB = b[sort.key] ?? ""
      if (valA < valB) return sort.dir === "asc" ? -1 : 1
      if (valA > valB) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return copied
  }, [filteredCompanies, sort])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedCompanies.length / pageSize)), [sortedCompanies.length, pageSize])
  const currentPage = Math.min(page, totalPages)
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sortedCompanies.slice(start, end)
  }, [sortedCompanies, currentPage, pageSize])

  const hasCompanies = useMemo(() => (companies?.length || 0) > 0, [companies])

  useEffect(() => {
    let isActive = true
    const loadCompanies = async () => {
      setIsLoading(true)
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const userId = userData?.user?.id
        if (!userId) {
          setCompanies([])
          setMessage({ type: "error", text: "You must be signed in to view companies." })
          return
        }

        const { data, error } = await supabase
          .from("companies")
          .select("id, name, industry, website, phone, address, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error
        if (isActive) setCompanies(data || [])
      } catch (err) {
        console.error("Error loading companies:", err)
        if (isActive) setMessage({ type: "error", text: "Failed to load companies." })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadCompanies()
    return () => {
      isActive = false
    }
  }, [])

  const openModal = () => {
    setFormValues({ name: "", industry: "", website: "", phone: "", address: "" })
    setMessage({ type: "", text: "" })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCompany(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const refreshCompanies = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, industry, website, phone, address, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setCompanies(data || [])
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Error refreshing companies:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: "", text: "" })
    try {
      const { name, industry, website, phone, address } = formValues

      if (!name) {
        setMessage({ type: "error", text: "Please provide a company name." })
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add companies." })
        return
      }

      if (editingCompany) {
        // Update existing company
        const { error } = await supabase
          .from("companies")
          .update({
            name: name || null,
            industry: industry || null,
            website: website || null,
            phone: phone || null,
            address: address || null,
          })
          .eq("id", editingCompany.id)
          .eq("user_id", userId)

        if (error) throw error
        setMessage({ type: "success", text: "Company updated successfully." })
      } else {
        // Insert new company
        const { error } = await supabase.from("companies").insert([
          {
            name: name || null,
            industry: industry || null,
            website: website || null,
            phone: phone || null,
            address: address || null,
            user_id: userId,
          },
        ])

        if (error) throw error
        setMessage({ type: "success", text: "Company added successfully." })
      }

      closeModal()
      await refreshCompanies()
    } catch (err) {
      console.error("Error saving company:", err)
      const friendly = err?.message || "Failed to save company."
      setMessage({ type: "error", text: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (company) => {
    setInlineEditId(company.id)
    setInlineValues({
      name: company.name || "",
      industry: company.industry || "",
      website: company.website || "",
      phone: company.phone || "",
      address: company.address || "",
    })
  }

  const handleDelete = async (companyId) => {
    if (!confirm("Are you sure you want to delete this company?")) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId)
        .eq("user_id", userId)

      if (error) throw error
      setMessage({ type: "success", text: "Company deleted successfully." })
      await refreshCompanies()
    } catch (err) {
      console.error("Error deleting company:", err)
      setMessage({ type: "error", text: "Failed to delete company." })
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
        paginatedCompanies.forEach((c) => next.add(c.id))
      } else {
        paginatedCompanies.forEach((c) => next.delete(c.id))
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
    if (!confirm(`Delete ${selectedIds.size} selected company(ies)?`)) return
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from("companies")
        .delete()
        .in("id", ids)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Selected companies deleted." })
      await refreshCompanies()
    } catch (err) {
      console.error("Error bulk deleting:", err)
      setMessage({ type: "error", text: "Failed to delete selected companies." })
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
        .from("companies")
        .update({
          name: inlineValues.name || null,
          industry: inlineValues.industry || null,
          website: inlineValues.website || null,
          phone: inlineValues.phone || null,
          address: inlineValues.address || null,
        })
        .eq("id", id)
        .eq("user_id", userId)
      if (error) throw error
      setMessage({ type: "success", text: "Company updated." })
      setInlineEditId(null)
      await refreshCompanies()
    } catch (err) {
      console.error("Inline save error:", err)
      setMessage({ type: "error", text: "Failed to update company." })
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
      if (!quickAdd.name) {
        setMessage({ type: "error", text: "Please provide a company name." })
        return
      }
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setMessage({ type: "error", text: "You must be signed in to add companies." })
        return
      }
      const { error } = await supabase.from("companies").insert([
        {
          name: quickAdd.name || null,
          industry: quickAdd.industry || null,
          website: quickAdd.website || null,
          phone: quickAdd.phone || null,
          address: quickAdd.address || null,
          user_id: userId,
        },
      ])
      if (error) throw error
      setMessage({ type: "success", text: "Company added." })
      setQuickAdd({ name: "", industry: "", website: "", phone: "", address: "" })
      setPage(1)
      await refreshCompanies()
    } catch (err) {
      console.error("Quick add error:", err)
      setMessage({ type: "error", text: "Failed to add company." })
    }
  }

  const exportCSV = () => {
    const rows = [
      ["Name", "Industry", "Website", "Phone", "Address", "Created"],
      ...sortedCompanies.map((c) => [
        c.name || "",
        c.industry || "",
        c.website || "",
        c.phone || "",
        c.address || "",
        c.created_at ? new Date(c.created_at).toISOString() : "",
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "companies.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
        <p className="text-gray-600 mt-2">Manage your company accounts and organizations</p>
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
              <h2 className="text-xl font-semibold text-gray-900">All Companies</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredCompanies.length} of {companies.length} companies
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
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
              {/* Add Company Button */}
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
              Add Company
            </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick add bar */}
          <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                type="text"
                name="name"
                value={quickAdd.name}
                onChange={handleQuickAddChange}
                placeholder="Company Name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="industry"
                value={quickAdd.industry}
                onChange={handleQuickAddChange}
                placeholder="Industry"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="url"
                name="website"
                value={quickAdd.website}
                onChange={handleQuickAddChange}
                placeholder="Website"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="phone"
                value={quickAdd.phone}
                onChange={handleQuickAddChange}
                placeholder="Phone"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="address"
                value={quickAdd.address}
                onChange={handleQuickAddChange}
                placeholder="Address"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex md:justify-end">
                <button
                  onClick={handleQuickAdd}
                  className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" /> Quick Add
                </button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading companies...</span>
            </div>
          ) : hasCompanies ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={paginatedCompanies.every((c) => selectedIds.has(c.id)) && paginatedCompanies.length > 0}
                        onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    {[
                      { key: "name", label: "Name" },
                      { key: "industry", label: "Industry" },
                      { key: "website", label: "Website" },
                      { key: "phone", label: "Phone" },
                      { key: "address", label: "Address" },
                      { key: "created_at", label: "Created" },
                    ].map((col) => (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-gray-700"
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
                  {paginatedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(company.id)}
                          onChange={(e) => toggleSelectRow(company.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      {inlineEditId === company.id ? (
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
                              type="text"
                              name="industry"
                              value={inlineValues.industry}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="url"
                              name="website"
                              value={inlineValues.website}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
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
                          <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              name="address"
                              value={inlineValues.address}
                              onChange={handleInlineChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {company.created_at ? new Date(company.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInlineSave(company.id)}
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
                            <div className="text-sm font-medium text-gray-900">{company.name || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{company.industry || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {company.website ? (
                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {company.website}
                                </a>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {company.phone ? (
                                <a href={`tel:${company.phone}`} className="text-blue-600 hover:text-blue-800">
                                  {company.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">{company.address || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {company.created_at ? new Date(company.created_at).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(company)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="Edit company"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(company.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded"
                                title="Delete company"
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
                  {Math.min(currentPage * pageSize, sortedCompanies.length)} of {sortedCompanies.length}
                </div>
                <div className="flex items-center gap-3">
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
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first company to build your organization database.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                Add Your First Company
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
                    {editingCompany ? "Edit Company" : "Add New Company"}
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
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formValues.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      value={formValues.industry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter industry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formValues.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formValues.address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingCompany ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        {editingCompany ? "Update Company" : "Add Company"}
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

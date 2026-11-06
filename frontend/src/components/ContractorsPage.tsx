import React, { useState, useEffect } from "react";
import {
  fetchContractors,
  addContractor,
  deleteContractor,
  updateContractor,
} from "../services/api";
import ContractorForm from "./ContractorForm";
import ContractorsList from "./ContractorsList";
import LogoutButton from "./LogoutButton";
import { toast } from "react-toastify";
import useDate from "../hooks/useDate";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";

interface Contractor {
  _id: string;
  name: string;
  nip: string;
  phone: string;
  address: string;
  contactDate: string;
  priceColorless?: number;
  priceColor?: number;
  priceUnknown?: number;
  typeUnknown?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const ContractorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [filteredContractors, setFilteredContractors] = useState<Contractor[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { date } = useDate(); // hooks for useDate

  useEffect(() => {
    const loadContractors = async () => {
      try {
        const data = (await fetchContractors()) as Contractor[];
        setContractors(data);
        setFilteredContractors(data);
      } catch (error) {
        console.error("Failed to load contractors:", error);
      }
    };
    loadContractors();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = contractors.filter((contractor) =>
      contractor.name.toLowerCase().includes(term)
    );

    setFilteredContractors(filtered);
  };

  const handleAddContractor = async (newContractor: Contractor) => {
    try {
      const addedContractor = (await addContractor(newContractor)) as Contractor;
      const updatedContractors = [...contractors, addedContractor];
      setContractors(updatedContractors);
      setFilteredContractors(updatedContractors);
      toast.success("Contractor added successfully!");
    } catch (error) {
      console.error("Failed to add contractor:", error);
      toast.error("Failed to add contractor");
    }
  };

  const handleUpdateContractor = async (updatedContractor: Contractor) => {
    try {
      const updated = (await updateContractor(
        updatedContractor._id,
        updatedContractor
      )) as Contractor;
      const updatedList = contractors.map((contractor) =>
        contractor._id === updated._id ? updated : contractor
      );
      setContractors(updatedList);
      setFilteredContractors(updatedList);
      setEditingContractor(null);
      toast.success("Contractor updated successfully!");
    } catch (error) {
      console.error("Failed to update contractor:", error);
      toast.error("Failed to update contractor");
    }
  };

  const handleDeleteContractor = async (id: string) => {
    try {
      await deleteContractor(id);
      const updatedList = contractors.filter(
        (contractor) => contractor._id !== id
      );
      setContractors(updatedList);
      setFilteredContractors(updatedList);
      toast.info("Contractor deleted");
    } catch (error) {
      console.error("Failed to delete contractor:", error);
      toast.error("Failed to delete contractor");
    }
  };

  const handleEditContractor = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setIsSidebarOpen(true); // Otwieramy panel boczny przy edycji
  };

  // Pobierz nazwę użytkownika
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  // Nawigacja do dashboardu
  const goToDashboard = () => {
    navigate("/dashboard");
  };

  // Inicjalizacja AOS
  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-sky-400 to-blue-500">
      {/* Nagłówek */}
      <div className="flex items-center justify-between p-6 text-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToDashboard}
            className="p-2 transition duration-300 bg-white rounded-full bg-opacity-20 hover:bg-opacity-40 hover:bg-sky-200"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-3xl font-bold">Contractors Management</h1>
        </div>
        <LogoutButton />
      </div>

      {/* Data i podpis */}
      <div className="mb-4 text-center text-white" data-aos="fade-down">
        <p className="text-xl sm:text-lg">
          {date} | Signed in as {userName}
        </p>
      </div>

      {/* Treść */}
      <div className="flex flex-col flex-grow lg:flex-row">
        {/* Lista kontrahentów */}
        <div className="flex-1 pt-6 pl-4 overflow-y-auto">
          {/* Pasek wyszukiwania */}
          <div className="flex items-center mb-6" data-aos="fade-down">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search by company name"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full py-2 pl-10 pr-4 rounded-full shadow focus:outline-none"
              />
              <FaArrowLeft className="absolute text-gray-500 left-3 top-3" />
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 ml-4 transition duration-300 bg-white rounded-full bg-opacity-20 hover:bg-opacity-40 lg:invisible hover:bg-sky-300"
            >
              + Add
            </button>
          </div>

          {/* Lista kontrahentów */}
          <div data-aos="fade-up">
            <ContractorsList
              contractors={filteredContractors}
              onDeleteContractor={handleDeleteContractor}
              onEditContractor={handleEditContractor}
            />
          </div>
        </div>

        {/* Panel boczny */}
        <div
          className={`fixed lg:static top-0 right-0 z-20 w-full lg:w-1/3 h-full shadow-lg transform transition-transform ${
            isSidebarOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full p-6 overflow-y-auto md:bg-transparent sm:bg-white">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 mb-4 text-white transition duration-300 bg-red-500 rounded-full lg:hidden hover:bg-red-600"
            >
              Close
            </button>
            <ContractorForm
              contractor={editingContractor}
              onAddContractor={handleAddContractor}
              onUpdateContractor={handleUpdateContractor}
            />
          </div>
        </div>
      </div>

      {/* Stopka */}
      <footer className="p-4 text-center text-white">
        &copy; {new Date().getFullYear()} ContractorFoil
      </footer>
    </div>
  );
};

export default ContractorsPage;

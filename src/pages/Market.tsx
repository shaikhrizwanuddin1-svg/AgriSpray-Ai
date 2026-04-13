import { useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Leaf, Wheat, Shield, Heart, Beef, Wrench, ShoppingCart, Search, Star, Tag, Plus, Send } from "lucide-react";

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  products: Product[];
};

type Product = {
  name: string;
  brand: string;
  price: string;
  unit: string;
  rating: number;
  tag?: string;
  image?: string;
};

type CropListing = {
  id: string;
  cropType: string;
  netQuantity: number;
  quantityUnit: string;
  cropRate: number;
  farmerName?: string;
  location?: string;
  description?: string;
};

const CATEGORIES: Category[] = [
  {
    id: "pesticides",
    label: "Pesticides & Fertilizers",
    icon: Sprout,
    color: "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
    products: [
      { name: "Chlorpyrifos 20% EC", brand: "Dhanuka", price: "₹320", unit: "500ml", rating: 4.5, tag: "Best Seller", image: "https://images.unsplash.com/photo-1584947960686-fc91c20354b8?w=300&h=300&fit=crop" },
      { name: "Imidacloprid 17.8% SL", brand: "Bayer", price: "₹480", unit: "250ml", rating: 4.7, image: "https://images.unsplash.com/photo-1559798265-cd4628902d4a?w=300&h=300&fit=crop" },
      { name: "Urea 46% N", brand: "IFFCO", price: "₹266", unit: "50kg", rating: 4.8, tag: "Govt Rate", image: "https://images.unsplash.com/photo-1600788148184-403f7691aed0?w=300&h=300&fit=crop" },
      { name: "DAP Fertilizer", brand: "IFFCO", price: "₹1350", unit: "50kg", rating: 4.9, tag: "Popular", image: "https://images.unsplash.com/photo-1594707985884-3b8e1e5937f7?w=300&h=300&fit=crop" },
      { name: "NPK 19:19:19", brand: "Coromandel", price: "₹1200", unit: "25kg", rating: 4.6, image: "https://images.unsplash.com/photo-1592863291100-2892a51fcc93?w=300&h=300&fit=crop" },
      { name: "Mancozeb 75% WP", brand: "Indofil", price: "₹280", unit: "500g", rating: 4.4, image: "https://images.unsplash.com/photo-1576678927484-cc907957a753?w=300&h=300&fit=crop" },
    ],
  },
  {
    id: "seeds",
    label: "Seeds",
    icon: Wheat,
    color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    products: [
      { name: "Hybrid Tomato Seeds", brand: "Syngenta", price: "₹850", unit: "10g", rating: 4.8, tag: "High Yield", image: "https://images.unsplash.com/photo-1606787620315-759cd757b47f?w=300&h=300&fit=crop" },
      { name: "BT Cotton Seeds", brand: "Mahyco", price: "₹930", unit: "450g", rating: 4.5, image: "https://images.unsplash.com/photo-1585241066521-b72d2dfc9e5e?w=300&h=300&fit=crop" },
      { name: "Paddy IR-64", brand: "IARI", price: "₹45", unit: "1kg", rating: 4.6, tag: "Certified", image: "https://images.unsplash.com/photo-1535909980850-fb70f97f49e3?w=300&h=300&fit=crop" },
      { name: "Soybean JS-335", brand: "NRCS", price: "₹80", unit: "1kg", rating: 4.7, image: "https://images.unsplash.com/photo-1574943320219-553eb2f72f97?w=300&h=300&fit=crop" },
      { name: "Maize Pioneer 30V92", brand: "Pioneer", price: "₹1200", unit: "4kg", rating: 4.9, tag: "Best Seller", image: "https://images.unsplash.com/photo-1599599810694-b5ac4dd83eaf?w=300&h=300&fit=crop" },
      { name: "Onion Agrifound Dark Red", brand: "NHRDF", price: "₹320", unit: "500g", rating: 4.5, image: "https://images.unsplash.com/photo-1596040243406-36a37f5cbc51?w=300&h=300&fit=crop" },
    ],
  },
  {
    id: "organic-protection",
    label: "Organic Crop Protection",
    icon: Shield,
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    products: [
      { name: "Neem Oil 10000 PPM", brand: "Agri Gold", price: "₹380", unit: "1L", rating: 4.6, tag: "Organic", image: "https://images.unsplash.com/photo-1595521680568-3b3ab0c0e186?w=300&h=300&fit=crop" },
      { name: "Trichoderma Viride", brand: "T-Stanes", price: "₹220", unit: "1kg", rating: 4.5, tag: "Bio", image: "https://images.unsplash.com/photo-1530206366500-9cff4b0a9b29?w=300&h=300&fit=crop" },
      { name: "Beauveria Bassiana", brand: "Biostadt", price: "₹450", unit: "1kg", rating: 4.4, image: "https://images.unsplash.com/photo-1574943320219-553eb2f72f97?w=300&h=300&fit=crop" },
      { name: "Pseudomonas Fluorescens", brand: "Multiplex", price: "₹180", unit: "1kg", rating: 4.7, tag: "Bio", image: "https://images.unsplash.com/photo-1577969865237-4169ce5e5f84?w=300&h=300&fit=crop" },
      { name: "Spinosad 45% SC", brand: "Dow", price: "₹1200", unit: "100ml", rating: 4.8, image: "https://images.unsplash.com/photo-1584947960686-fc91c20354b8?w=300&h=300&fit=crop" },
      { name: "Karanja Oil", brand: "Agri Plus", price: "₹290", unit: "1L", rating: 4.3, tag: "Organic", image: "https://images.unsplash.com/photo-1559798265-cd4628902d4a?w=300&h=300&fit=crop" },
    ],
  },
  {
    id: "organic-nutrition",
    label: "Organic Crop Nutrition",
    icon: Leaf,
    color: "border-lime-500/40 bg-lime-500/10 text-lime-600 dark:text-lime-400",
    products: [
      { name: "Vermicompost", brand: "Krishi Jaivik", price: "₹12", unit: "1kg", rating: 4.8, tag: "Popular", image: "https://images.unsplash.com/photo-1574943320219-553eb2f72f97?w=300&h=300&fit=crop" },
      { name: "Jeevamrut Liquid", brand: "Organic India", price: "₹250", unit: "5L", rating: 4.7, image: "https://images.unsplash.com/photo-1559798265-cd4628902d4a?w=300&h=300&fit=crop" },
      { name: "Seaweed Extract", brand: "Kelpak", price: "₹680", unit: "1L", rating: 4.6, image: "https://images.unsplash.com/photo-1595521680568-3b3ab0c0e186?w=300&h=300&fit=crop" },
      { name: "Humic Acid 12%", brand: "Multiplex", price: "₹320", unit: "1kg", rating: 4.5, image: "https://images.unsplash.com/photo-1600788148184-403f7691aed0?w=300&h=300&fit=crop" },
      { name: "Azospirillum", brand: "T-Stanes", price: "₹120", unit: "1kg", rating: 4.6, tag: "Bio", image: "https://images.unsplash.com/photo-1530206366500-9cff4b0a9b29?w=300&h=300&fit=crop" },
      { name: "Phosphate Solubilizing Bacteria", brand: "Biostadt", price: "₹150", unit: "1kg", rating: 4.4, image: "https://images.unsplash.com/photo-1577969865237-4169ce5e5f84?w=300&h=300&fit=crop" },
    ],
  },
  {
    id: "cattle-feed",
    label: "Cattle Feed",
    icon: Beef,
    color: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    products: [
      { name: "Cattle Feed Pellets", brand: "Godrej Agrovet", price: "₹1400", unit: "50kg", rating: 4.7, tag: "Best Seller", image: "https://images.unsplash.com/photo-1633786481023-3c6450bc5fe0?w=300&h=300&fit=crop" },
      { name: "Mineral Mixture", brand: "Provimi", price: "₹480", unit: "5kg", rating: 4.6, image: "https://images.unsplash.com/photo-1600788148184-403f7691aed0?w=300&h=300&fit=crop" },
      { name: "Bypass Protein Feed", brand: "Amul", price: "₹2200", unit: "50kg", rating: 4.8, image: "https://images.unsplash.com/photo-1594707985884-3b8e1e5937f7?w=300&h=300&fit=crop" },
      { name: "Silage Maize", brand: "Pioneer", price: "₹18", unit: "1kg", rating: 4.5, image: "https://images.unsplash.com/photo-1599599810694-b5ac4dd83eaf?w=300&h=300&fit=crop" },
      { name: "Urea Molasses Block", brand: "NDDB", price: "₹320", unit: "10kg", rating: 4.4, image: "https://images.unsplash.com/photo-1576678927484-cc907957a753?w=300&h=300&fit=crop" },
      { name: "Azolla Dry Powder", brand: "Agri Plus", price: "₹180", unit: "1kg", rating: 4.3, tag: "Organic", image: "https://images.unsplash.com/photo-1559798265-cd4628902d4a?w=300&h=300&fit=crop" },
    ],
  },
  {
    id: "tools",
    label: "Tools & Machinery",
    icon: Wrench,
    color: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    products: [
      { name: "Battery Sprayer 16L", brand: "Neptune", price: "₹2800", unit: "1 unit", rating: 4.7, tag: "Popular", image: "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=300&h=300&fit=crop" },
      { name: "Hand Weeder", brand: "Kisankraft", price: "₹180", unit: "1 unit", rating: 4.5, image: "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=300&h=300&fit=crop" },
      { name: "Soil pH Meter", brand: "HM Digital", price: "₹1200", unit: "1 unit", rating: 4.6, image: "https://images.unsplash.com/photo-1581092162562-40038f3c4a1a?w=300&h=300&fit=crop" },
      { name: "Drip Irrigation Kit 1 Acre", brand: "Jain Irrigation", price: "₹8500", unit: "1 set", rating: 4.8, tag: "Best Seller", image: "https://images.unsplash.com/photo-1574943320219-553eb2f72f97?w=300&h=300&fit=crop" },
      { name: "Power Tiller 7HP", brand: "VST Shakti", price: "₹85000", unit: "1 unit", rating: 4.9, image: "https://images.unsplash.com/photo-1581092162562-40038f3c4a1a?w=300&h=300&fit=crop" },
      { name: "Knapsack Sprayer 16L", brand: "Aspee", price: "₹650", unit: "1 unit", rating: 4.4, image: "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=300&h=300&fit=crop" },
    ],
  },
];

const Market = () => {
  const [activeCategory, setActiveCategory] = useState("pesticides");
  const [search, setSearch] = useState("");
  const [showSellForm, setShowSellForm] = useState(false);
  const [cropListings, setCropListings] = useState<CropListing[]>([
    {
      id: "1",
      cropType: "Tomato",
      netQuantity: 500,
      quantityUnit: "kg",
      cropRate: 25,
      farmerName: "Rajesh Kumar",
      location: "Bangalore",
      description: "Fresh organic tomatoes",
    },
    {
      id: "2",
      cropType: "Wheat",
      netQuantity: 1000,
      quantityUnit: "kg",
      cropRate: 22,
      farmerName: "Harjeet Singh",
      location: "Punjab",
      description: "Premium quality wheat",
    },
    {
      id: "3",
      cropType: "Onion",
      netQuantity: 300,
      quantityUnit: "kg",
      cropRate: 35,
      farmerName: "Priya Sharma",
      location: "Maharashtra",
      description: "Red onions freshly harvested",
    },
  ]);

  const [formData, setFormData] = useState({
    cropType: "",
    netQuantity: "",
    quantityUnit: "kg",
    cropRate: "",
    farmerName: "",
    location: "",
    description: "",
  });

  const handleAddCrop = (e: React.FormEvent) => {
    e.preventDefault();
    const newListing: CropListing = {
      id: Date.now().toString(),
      cropType: formData.cropType,
      netQuantity: parseFloat(formData.netQuantity),
      quantityUnit: formData.quantityUnit,
      cropRate: parseFloat(formData.cropRate),
      farmerName: formData.farmerName,
      location: formData.location,
      description: formData.description,
    };
    setCropListings([...cropListings, newListing]);
    setFormData({
      cropType: "",
      netQuantity: "",
      quantityUnit: "kg",
      cropRate: "",
      farmerName: "",
      location: "",
      description: "",
    });
    setShowSellForm(false);
  };

  const category = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];
  const filtered = category.products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-1 text-3xl font-bold">Market</h1>
        <p className="text-muted-foreground">Agricultural products for your farm needs</p>
      </div>

      {/* Main tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setActiveCategory(""); setSearch(""); }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            activeCategory === ""
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Heart className="h-4 w-4" />
          Buy Products
        </button>
        <button
          onClick={() => setShowSellForm(!showSellForm)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            showSellForm
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Plus className="h-4 w-4" />
          Sell Your Crop
        </button>
      </div>

      {/* Buy Products Section */}
      {activeCategory !== "" && (
        <>
          {/* category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? cat.color + " shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search in ${category.label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* products grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product, i) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Product Image */}
                {product.image && (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img
                      src={product.image}
                      alt={`${product.name} by ${product.brand}`}
                      className="h-full w-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    {product.tag && (
                      <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Tag className="h-3 w-3" />
                        {product.tag}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold leading-tight">{product.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>

                  <div className="mt-3 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-3.5 w-3.5 ${j < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{product.rating}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-primary">{product.price}</p>
                      <p className="text-xs text-muted-foreground">per {product.unit}</p>
                    </div>
                    <button className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
              No products found for "{search}"
            </div>
          )}
        </>
      )}

      {/* Sell Your Crop Section */}
      {showSellForm && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="text-xl font-bold">List Your Crop for Sale</h2>
          <form onSubmit={handleAddCrop} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Crop Type *</label>
                <input
                  type="text"
                  placeholder="e.g., Tomato, Wheat, Onion"
                  value={formData.cropType}
                  onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                  required
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Net Quantity *</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.netQuantity}
                    onChange={(e) => setFormData({ ...formData, netQuantity: e.target.value })}
                    required
                    step="0.01"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <select
                    value={formData.quantityUnit}
                    onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="tonnes">tonnes</option>
                    <option value="liters">liters</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">Crop Rate (₹ per unit) *</label>
                <input
                  type="number"
                  placeholder="e.g., 25"
                  value={formData.cropRate}
                  onChange={(e) => setFormData({ ...formData, cropRate: e.target.value })}
                  required
                  step="0.01"
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Farmer Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formData.farmerName}
                  onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Location</label>
                <input
                  type="text"
                  placeholder="City/State"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  placeholder="Add details about your crop (quality, harvest date, storage condition, etc.)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                List Crop
              </button>
              <button
                type="button"
                onClick={() => setShowSellForm(false)}
                className="rounded-xl border border-border bg-card px-6 py-2.5 font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Crop Listings Section */}
      {!activeCategory && !showSellForm && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Available Crops from Farmers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cropListings.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Crop Image Placeholder */}
                <div className="mb-4 h-32 w-full rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <Wheat className="h-12 w-12 text-white opacity-80" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-primary">{listing.cropType}</h3>
                  {listing.farmerName && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Farmer:</span> {listing.farmerName}
                    </p>
                  )}
                  {listing.location && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Location:</span> {listing.location}
                    </p>
                  )}

                  {listing.description && (
                    <p className="text-xs text-muted-foreground italic">{listing.description}</p>
                  )}

                  <div className="border-t border-border pt-3 mt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Quantity:</span>
                      <span className="font-semibold">
                        {listing.netQuantity} {listing.quantityUnit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Rate:</span>
                      <span className="text-xl font-bold text-primary">₹{listing.cropRate}</span>
                    </div>
                  </div>

                  <button className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                    <ShoppingCart className="h-4 w-4" />
                    Contact Farmer
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Default Buy Products view on initial load */}
      {activeCategory === "" && !showSellForm && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center"
        >
          <ShoppingCart className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Select a product category or list your crop for sale</p>
        </motion.div>
      )}
    </div>
  );
};

export default Market;

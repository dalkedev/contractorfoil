const mongoose = require("mongoose");

const contractorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    nip: { type: String, required: true },
    address: { type: String, required: true },
    contactDate: { type: Date },
    notes: { type: String },
    priceColorless: { type: Number },
    priceColor: { type: Number },
    typeUnknown: { type: String },
    priceUnknown: { type: Number },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

contractorSchema.index({ user: 1 });

module.exports = mongoose.model("Contractor", contractorSchema);

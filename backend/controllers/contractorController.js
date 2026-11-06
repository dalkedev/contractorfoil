const Contractor = require('../models/contractorModel');
const { contractorInput, validateId } = require('../validation');
const { ApiError } = require('../errors');

const owned = req => ({ _id: validateId(req.params.id), user: req.user._id });
const requireRecord = record => {
  if (!record) throw new ApiError(404, 'CONTRACTOR_NOT_FOUND', 'Contractor not found.');
  return record;
};

async function addContractor(req, res) {
  const input = contractorInput(req.body);
  res.status(201).json(await Contractor.create({ ...input, user: req.user._id }));
}

async function getContractors(req, res) {
  res.json(await Contractor.find({ user: req.user._id }));
}

async function getContractorById(req, res) {
  res.json(requireRecord(await Contractor.findOne(owned(req))));
}

async function updateContractor(req, res) {
  const query = owned(req);
  const input = contractorInput(req.body, { partial: true, id: req.params.id });
  // No-op legacy echoes do not rewrite timestamps or omitted optional fields.
  const record = Object.keys(input).length === 0 ? await Contractor.findOne(query) :
    await Contractor.findOneAndUpdate(query, { $set: input }, { new: true, runValidators: true });
  res.json(requireRecord(record));
}

async function deleteContractor(req, res) {
  requireRecord(await Contractor.findOneAndDelete(owned(req)));
  res.json({ message: 'Contractor deleted successfully' });
}

module.exports = { addContractor, getContractors, getContractorById, updateContractor, deleteContractor };

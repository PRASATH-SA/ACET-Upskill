// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AttackEvidenceRegistry
 * @dev Tamper-evident ledger for cryptographic evidence hashes of verified DDoS incidents.
 * Append-only immutable record-keeping with strict role-based access control.
 */
contract AttackEvidenceRegistry {
    address public owner;
    mapping(address => bool) public authorizedOperators;

    struct EvidenceRecord {
        string incidentId;
        string evidenceHash;     // SHA-256 hex digest
        string schemaVersion;    // e.g. "1.0"
        string modelVersion;     // e.g. "1.0.0"
        string verificationStatus; // e.g. "HUMAN_CONFIRMED", "DETECTED"
        uint256 recordedTimestamp;
        address recordedBy;
        bool exists;
    }

    // Mapping from incidentId => EvidenceRecord
    mapping(string => EvidenceRecord) private _records;
    
    // Ordered list of all registered incident IDs for audit indexing
    string[] private _incidentIds;

    // Events
    event IncidentEvidenceRegistered(
        string indexed incidentId,
        string evidenceHash,
        string verificationStatus,
        uint256 timestamp,
        address indexed recordedBy
    );

    event OperatorUpdated(address indexed operator, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AttackEvidenceRegistry: caller is not the owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == owner || authorizedOperators[msg.sender], "AttackEvidenceRegistry: unauthorized operator");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedOperators[msg.sender] = true;
        emit OperatorUpdated(msg.sender, true);
    }

    function setOperator(address operator, bool authorized) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        authorizedOperators[operator] = authorized;
        emit OperatorUpdated(operator, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Registers cryptographic evidence hash for an incident.
     * @dev Reverts if the incidentId is already registered to preserve strict append-only immutability.
     */
    function registerEvidence(
        string calldata incidentId,
        string calldata evidenceHash,
        string calldata schemaVersion,
        string calldata modelVersion,
        string calldata verificationStatus
    ) external onlyOperator {
        require(bytes(incidentId).length > 0, "Incident ID cannot be empty");
        require(bytes(evidenceHash).length > 0, "Evidence hash cannot be empty");
        require(!_records[incidentId].exists, "Evidence for this incident is already registered (immutable)");

        _records[incidentId] = EvidenceRecord({
            incidentId: incidentId,
            evidenceHash: evidenceHash,
            schemaVersion: schemaVersion,
            modelVersion: modelVersion,
            verificationStatus: verificationStatus,
            recordedTimestamp: block.timestamp,
            recordedBy: msg.sender,
            exists: true
        });

        _incidentIds.push(incidentId);

        emit IncidentEvidenceRegistered(
            incidentId,
            evidenceHash,
            verificationStatus,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @notice Retrieves the registered evidence record for an incident.
     */
    function getEvidence(string calldata incidentId) external view returns (
        string memory id,
        string memory hashDigest,
        string memory schemaVer,
        string memory modelVer,
        string memory status,
        uint256 timestamp,
        address submitter
    ) {
        EvidenceRecord memory rec = _records[incidentId];
        require(rec.exists, "Incident not found in evidence registry");
        return (
            rec.incidentId,
            rec.evidenceHash,
            rec.schemaVersion,
            rec.modelVersion,
            rec.verificationStatus,
            rec.recordedTimestamp,
            rec.recordedBy
        );
    }

    /**
     * @notice Checks if an incident exists and matches the provided hash.
     */
    function verifyEvidenceHash(string calldata incidentId, string calldata expectedHash) external view returns (bool matches, bool exists) {
        EvidenceRecord memory rec = _records[incidentId];
        if (!rec.exists) {
            return (false, false);
        }
        return (keccak256(bytes(rec.evidenceHash)) == keccak256(bytes(expectedHash)), true);
    }

    /**
     * @notice Total number of registered incidents.
     */
    function totalRecords() external view returns (uint256) {
        return _incidentIds.length;
    }

    /**
     * @notice Returns incident ID by index.
     */
    function getIncidentIdByIndex(uint256 index) external view returns (string memory) {
        require(index < _incidentIds.length, "Index out of bounds");
        return _incidentIds[index];
    }
}

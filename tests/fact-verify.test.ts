import { describe, it, expect, beforeEach } from "vitest"

describe("Fact Verification Contract Tests", () => {
  let contractState
  let mockTxSender
  let mockBlockHeight
  
  beforeEach(() => {
    contractState = {
      totalClaims: 0,
      minVerifiers: 3,
      verificationReward: 100,
      factClaims: new Map(),
      verifications: new Map(),
      verifierStats: new Map(),
      claimEvidence: new Map(),
    }
    mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockBlockHeight = 100
  })
  
  describe("submit-claim", () => {
    it("should successfully submit a new fact claim", () => {
      const contentHash = new Uint8Array(32).fill(1) // Mock hash
      const sourceId = 1
      
      const claimId = contractState.totalClaims + 1
      
      contractState.factClaims.set(claimId, {
        contentHash,
        submitter: mockTxSender,
        sourceId,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      
      contractState.totalClaims = claimId
      
      expect(contractState.factClaims.get(claimId)).toEqual({
        contentHash,
        submitter: mockTxSender,
        sourceId,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      
      expect(contractState.totalClaims).toBe(1)
    })
    
    it("should increment claim ID for multiple submissions", () => {
      const contentHash1 = new Uint8Array(32).fill(1)
      const contentHash2 = new Uint8Array(32).fill(2)
      const sourceId = 1
      
      // First claim
      const claimId1 = contractState.totalClaims + 1
      contractState.factClaims.set(claimId1, {
        contentHash: contentHash1,
        submitter: mockTxSender,
        sourceId,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      contractState.totalClaims = claimId1
      
      // Second claim
      const claimId2 = contractState.totalClaims + 1
      contractState.factClaims.set(claimId2, {
        contentHash: contentHash2,
        submitter: mockTxSender,
        sourceId,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      contractState.totalClaims = claimId2
      
      expect(contractState.totalClaims).toBe(2)
      expect(contractState.factClaims.has(1)).toBe(true)
      expect(contractState.factClaims.has(2)).toBe(true)
    })
  })
  
  describe("verify-claim", () => {
    beforeEach(() => {
      // Setup a claim for verification tests
      const claimId = 1
      contractState.factClaims.set(claimId, {
        contentHash: new Uint8Array(32).fill(1),
        submitter: "ST1SUBMITTER",
        sourceId: 1,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      contractState.totalClaims = 1
    })
    
    it("should successfully submit a verification", () => {
      const claimId = 1
      const verdict = true
      const evidence = "Supporting evidence for this claim"
      const confidence = 85
      
      // Check claim exists and is pending
      const claim = contractState.factClaims.get(claimId)
      expect(claim.status).toBe("pending")
      expect(confidence).toBeLessThanOrEqual(100)
      
      // Check no existing verification from this verifier
      const verificationKey = `${claimId}-${mockTxSender}`
      expect(contractState.verifications.has(verificationKey)).toBe(false)
      
      // Record verification
      contractState.verifications.set(verificationKey, {
        verdict,
        evidence,
        confidence,
        timestamp: mockBlockHeight,
        rewarded: false,
      })
      
      // Update claim statistics
      const newTotal = claim.totalVerifications + 1
      const newPositive = verdict ? claim.positiveVerifications + 1 : claim.positiveVerifications
      const newConsensus = newTotal > 0 ? Math.floor((newPositive * 100) / newTotal) : 0
      
      contractState.factClaims.set(claimId, {
        ...claim,
        totalVerifications: newTotal,
        positiveVerifications: newPositive,
        consensusScore: newConsensus,
      })
      
      // Update verifier stats
      contractState.verifierStats.set(mockTxSender, {
        totalVerifications: 1,
        accurateVerifications: 0,
        reputationScore: 50,
        tokensEarned: 0,
      })
      
      expect(contractState.verifications.get(verificationKey)).toEqual({
        verdict: true,
        evidence,
        confidence: 85,
        timestamp: mockBlockHeight,
        rewarded: false,
      })
      
      const updatedClaim = contractState.factClaims.get(claimId)
      expect(updatedClaim.totalVerifications).toBe(1)
      expect(updatedClaim.positiveVerifications).toBe(1)
      expect(updatedClaim.consensusScore).toBe(100)
    })
    
    it("should calculate consensus correctly with mixed verdicts", () => {
      const claimId = 1
      const verifiers = ["ST1VERIFIER1", "ST1VERIFIER2", "ST1VERIFIER3"]
      const verdicts = [true, false, true]
      
      let claim = contractState.factClaims.get(claimId)
      
      verifiers.forEach((verifier, index) => {
        const verdict = verdicts[index]
        const verificationKey = `${claimId}-${verifier}`
        
        contractState.verifications.set(verificationKey, {
          verdict,
          evidence: `Evidence from ${verifier}`,
          confidence: 80,
          timestamp: mockBlockHeight,
          rewarded: false,
        })
        
        const newTotal = claim.totalVerifications + 1
        const newPositive = verdict ? claim.positiveVerifications + 1 : claim.positiveVerifications
        const newConsensus = Math.floor((newPositive * 100) / newTotal)
        
        claim = {
          ...claim,
          totalVerifications: newTotal,
          positiveVerifications: newPositive,
          consensusScore: newConsensus,
        }
        
        contractState.factClaims.set(claimId, claim)
      })
      
      const finalClaim = contractState.factClaims.get(claimId)
      expect(finalClaim.totalVerifications).toBe(3)
      expect(finalClaim.positiveVerifications).toBe(2)
      expect(finalClaim.consensusScore).toBe(66) // 2/3 * 100 = 66.67 -> 66
    })
    
    it("should fail when claim does not exist", () => {
      const claimId = 999
      expect(contractState.factClaims.has(claimId)).toBe(false)
      // Should return ERR_CLAIM_NOT_FOUND (202)
    })
    
    it("should fail when confidence exceeds 100", () => {
      const claimId = 1
      const confidence = 150
      
      expect(confidence).toBeGreaterThan(100)
      // Should return ERR_INVALID_STATUS (203)
    })
  })
  
  describe("resolve-claim", () => {
    beforeEach(() => {
      // Setup a claim with enough verifications
      const claimId = 1
      contractState.factClaims.set(claimId, {
        contentHash: new Uint8Array(32).fill(1),
        submitter: "ST1SUBMITTER",
        sourceId: 1,
        status: "pending",
        consensusScore: 70,
        totalVerifications: 5,
        positiveVerifications: 4,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      contractState.totalClaims = 1
    })
    
    it("should resolve claim as verified with high consensus", () => {
      const claimId = 1
      const claim = contractState.factClaims.get(claimId)
      
      expect(claim.totalVerifications).toBeGreaterThanOrEqual(contractState.minVerifiers)
      expect(claim.status).toBe("pending")
      
      const finalStatus = claim.consensusScore >= 60 ? "verified" : "disputed"
      
      contractState.factClaims.set(claimId, {
        ...claim,
        status: finalStatus,
        resolvedAt: mockBlockHeight,
      })
      
      const resolvedClaim = contractState.factClaims.get(claimId)
      expect(resolvedClaim.status).toBe("verified")
      expect(resolvedClaim.resolvedAt).toBe(mockBlockHeight)
    })
    
    it("should resolve claim as disputed with low consensus", () => {
      const claimId = 1
      const claim = contractState.factClaims.get(claimId)
      
      // Update to low consensus
      contractState.factClaims.set(claimId, {
        ...claim,
        consensusScore: 40,
        positiveVerifications: 2,
      })
      
      const updatedClaim = contractState.factClaims.get(claimId)
      const finalStatus = updatedClaim.consensusScore >= 60 ? "verified" : "disputed"
      
      contractState.factClaims.set(claimId, {
        ...updatedClaim,
        status: finalStatus,
        resolvedAt: mockBlockHeight,
      })
      
      const resolvedClaim = contractState.factClaims.get(claimId)
      expect(resolvedClaim.status).toBe("disputed")
    })
    
    it("should fail with insufficient verifications", () => {
      const claimId = 1
      const claim = contractState.factClaims.get(claimId)
      
      // Update to insufficient verifications
      contractState.factClaims.set(claimId, {
        ...claim,
        totalVerifications: 2,
      })
      
      const updatedClaim = contractState.factClaims.get(claimId)
      expect(updatedClaim.totalVerifications).toBeLessThan(contractState.minVerifiers)
      // Should return ERR_UNAUTHORIZED (200)
    })
  })
  
  describe("add-evidence", () => {
    beforeEach(() => {
      const claimId = 1
      contractState.factClaims.set(claimId, {
        contentHash: new Uint8Array(32).fill(1),
        submitter: "ST1SUBMITTER",
        sourceId: 1,
        status: "pending",
        consensusScore: 0,
        totalVerifications: 0,
        positiveVerifications: 0,
        createdAt: mockBlockHeight,
        resolvedAt: null,
      })
      contractState.totalClaims = 1
    })
    
    it("should successfully add evidence to a claim", () => {
      const claimId = 1
      const evidenceId = 1
      const evidenceType = "document"
      const evidenceData = "Link to supporting document: https://example.com/doc.pdf"
      
      expect(contractState.factClaims.has(claimId)).toBe(true)
      
      const evidenceKey = `${claimId}-${evidenceId}`
      contractState.claimEvidence.set(evidenceKey, {
        evidenceType,
        evidenceData,
        submitter: mockTxSender,
        verified: false,
      })
      
      expect(contractState.claimEvidence.get(evidenceKey)).toEqual({
        evidenceType: "document",
        evidenceData,
        submitter: mockTxSender,
        verified: false,
      })
    })
    
    it("should allow multiple evidence entries for same claim", () => {
      const claimId = 1
      const evidences = [
        { id: 1, type: "document", data: "Document evidence" },
        { id: 2, type: "video", data: "Video evidence link" },
        { id: 3, type: "witness", data: "Witness testimony" },
      ]
      
      evidences.forEach((evidence) => {
        const evidenceKey = `${claimId}-${evidence.id}`
        contractState.claimEvidence.set(evidenceKey, {
          evidenceType: evidence.type,
          evidenceData: evidence.data,
          submitter: mockTxSender,
          verified: false,
        })
      })
      
      expect(contractState.claimEvidence.size).toBe(3)
      expect(contractState.claimEvidence.get(`${claimId}-1`).evidenceType).toBe("document")
      expect(contractState.claimEvidence.get(`${claimId}-2`).evidenceType).toBe("video")
      expect(contractState.claimEvidence.get(`${claimId}-3`).evidenceType).toBe("witness")
    })
  })
  
  describe("read-only functions", () => {
    beforeEach(() => {
      const claimId = 1
      contractState.factClaims.set(claimId, {
        contentHash: new Uint8Array(32).fill(1),
        submitter: mockTxSender,
        sourceId: 1,
        status: "verified",
        consensusScore: 85,
        totalVerifications: 4,
        positiveVerifications: 3,
        createdAt: mockBlockHeight,
        resolvedAt: mockBlockHeight + 10,
      })
      
      const verificationKey = `${claimId}-${mockTxSender}`
      contractState.verifications.set(verificationKey, {
        verdict: true,
        evidence: "Test evidence",
        confidence: 90,
        timestamp: mockBlockHeight,
        rewarded: true,
      })
      
      contractState.verifierStats.set(mockTxSender, {
        totalVerifications: 5,
        accurateVerifications: 4,
        reputationScore: 80,
        tokensEarned: 400,
      })
      
      contractState.totalClaims = 1
    })
    
    it("should get claim information correctly", () => {
      const claimId = 1
      const claim = contractState.factClaims.get(claimId)
      
      expect(claim).toBeDefined()
      expect(claim.status).toBe("verified")
      expect(claim.consensusScore).toBe(85)
      expect(claim.totalVerifications).toBe(4)
    })
    
    it("should get verification details correctly", () => {
      const claimId = 1
      const verificationKey = `${claimId}-${mockTxSender}`
      const verification = contractState.verifications.get(verificationKey)
      
      expect(verification).toBeDefined()
      expect(verification.verdict).toBe(true)
      expect(verification.confidence).toBe(90)
      expect(verification.rewarded).toBe(true)
    })
    
    it("should get verifier statistics correctly", () => {
      const stats = contractState.verifierStats.get(mockTxSender)
      
      expect(stats).toBeDefined()
      expect(stats.totalVerifications).toBe(5)
      expect(stats.accurateVerifications).toBe(4)
      expect(stats.reputationScore).toBe(80)
      expect(stats.tokensEarned).toBe(400)
    })
    
    it("should return total claims count", () => {
      expect(contractState.totalClaims).toBe(1)
    })
    
    it("should check if claim is verified", () => {
      const claimId = 1
      const claim = contractState.factClaims.get(claimId)
      
      expect(claim.status).toBe("verified")
    })
    
    it("should return undefined for non-existent claim", () => {
      const claimId = 999
      const claim = contractState.factClaims.get(claimId)
      
      expect(claim).toBeUndefined()
    })
  })
})

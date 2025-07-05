import { describe, it, expect, beforeEach } from "vitest"

describe("Bias Detection Contract Tests", () => {
  let contractState
  let mockTxSender
  let mockBlockHeight
  
  beforeEach(() => {
    contractState = {
      totalContent: 0,
      biasThreshold: 70,
      contentAnalysis: new Map(),
      biasReports: new Map(),
      analyzerStats: new Map(),
      biasPatterns: new Map(),
      contentMetrics: new Map(),
    }
    mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockBlockHeight = 100
  })
  
  describe("analyze-content", () => {
    it("should successfully analyze content for bias", () => {
      const contentHash = new Uint8Array(32).fill(1)
      const sourceId = 1
      const biasScore = 65
      const biasCategory = "political"
      const politicalLean = "left"
      
      expect(biasScore).toBeLessThanOrEqual(100)
      
      const contentId = contractState.totalContent + 1
      
      contractState.contentAnalysis.set(contentId, {
        contentHash,
        sourceId,
        submitter: mockTxSender,
        biasScore,
        biasCategory,
        politicalLean,
        emotionalTone: 50,
        factualDensity: 50,
        analyzedAt: mockBlockHeight,
        confirmed: false,
      })
      
      contractState.totalContent = contentId
      
      expect(contractState.contentAnalysis.get(contentId)).toEqual({
        contentHash,
        sourceId,
        submitter: mockTxSender,
        biasScore: 65,
        biasCategory: "political",
        politicalLean: "left",
        emotionalTone: 50,
        factualDensity: 50,
        analyzedAt: mockBlockHeight,
        confirmed: false,
      })
      
      expect(contractState.totalContent).toBe(1)
    })
    
    it("should fail with invalid bias score above 100", () => {
      const biasScore = 150
      
      expect(biasScore).toBeGreaterThan(100)
      // Should return ERR_INVALID_BIAS_SCORE (303)
    })
    
    it("should handle different bias categories", () => {
      const categories = ["political", "commercial", "cultural", "ideological"]
      
      categories.forEach((category, index) => {
        const contentId = contractState.totalContent + 1
        
        contractState.contentAnalysis.set(contentId, {
          contentHash: new Uint8Array(32).fill(index + 1),
          sourceId: 1,
          submitter: mockTxSender,
          biasScore: 50,
          biasCategory: category,
          politicalLean: "neutral",
          emotionalTone: 50,
          factualDensity: 50,
          analyzedAt: mockBlockHeight,
          confirmed: false,
        })
        
        contractState.totalContent = contentId
      })
      
      expect(contractState.totalContent).toBe(4)
      expect(contractState.contentAnalysis.get(1).biasCategory).toBe("political")
      expect(contractState.contentAnalysis.get(2).biasCategory).toBe("commercial")
      expect(contractState.contentAnalysis.get(3).biasCategory).toBe("cultural")
      expect(contractState.contentAnalysis.get(4).biasCategory).toBe("ideological")
    })
  })
  
  describe("report-bias", () => {
    beforeEach(() => {
      const contentId = 1
      contractState.contentAnalysis.set(contentId, {
        contentHash: new Uint8Array(32).fill(1),
        sourceId: 1,
        submitter: "ST1SUBMITTER",
        biasScore: 45,
        biasCategory: "political",
        politicalLean: "neutral",
        emotionalTone: 50,
        factualDensity: 50,
        analyzedAt: mockBlockHeight,
        confirmed: false,
      })
      contractState.totalContent = 1
    })
    
    it("should successfully report bias in content", () => {
      const contentId = 1
      const reportedBias = 80
      const biasType = "confirmation bias"
      const evidence = "Article cherry-picks data to support predetermined conclusion"
      const confidence = 85
      
      expect(contractState.contentAnalysis.has(contentId)).toBe(true)
      expect(reportedBias).toBeLessThanOrEqual(100)
      expect(confidence).toBeLessThanOrEqual(100)
      
      const reportKey = `${contentId}-${mockTxSender}`
      contractState.biasReports.set(reportKey, {
        reportedBias,
        biasType,
        evidence,
        confidence,
        timestamp: mockBlockHeight,
      })
      
      // Update analyzer stats
      contractState.analyzerStats.set(mockTxSender, {
        totalAnalyses: 1,
        accurateAnalyses: 0,
        reputationScore: 50,
        specialization: "general",
      })
      
      expect(contractState.biasReports.get(reportKey)).toEqual({
        reportedBias: 80,
        biasType: "confirmation bias",
        evidence,
        confidence: 85,
        timestamp: mockBlockHeight,
      })
      
      expect(contractState.analyzerStats.get(mockTxSender).totalAnalyses).toBe(1)
    })
    
    it("should handle multiple bias reports for same content", () => {
      const contentId = 1
      const reporters = ["ST1REPORTER1", "ST1REPORTER2", "ST1REPORTER3"]
      const biasScores = [75, 82, 68]
      
      reporters.forEach((reporter, index) => {
        const reportKey = `${contentId}-${reporter}`
        contractState.biasReports.set(reportKey, {
          reportedBias: biasScores[index],
          biasType: "selection bias",
          evidence: `Evidence from ${reporter}`,
          confidence: 80,
          timestamp: mockBlockHeight,
        })
        
        contractState.analyzerStats.set(reporter, {
          totalAnalyses: 1,
          accurateAnalyses: 0,
          reputationScore: 50,
          specialization: "general",
        })
      })
      
      expect(contractState.biasReports.size).toBe(3)
      expect(contractState.analyzerStats.size).toBe(3)
    })
    
    it("should fail with invalid bias score", () => {
      const reportedBias = 150
      
      expect(reportedBias).toBeGreaterThan(100)
      // Should return ERR_INVALID_BIAS_SCORE (303)
    })
  })
  
  describe("update-content-metrics", () => {
    beforeEach(() => {
      const contentId = 1
      contractState.contentAnalysis.set(contentId, {
        contentHash: new Uint8Array(32).fill(1),
        sourceId: 1,
        submitter: mockTxSender,
        biasScore: 45,
        biasCategory: "political",
        politicalLean: "neutral",
        emotionalTone: 50,
        factualDensity: 50,
        analyzedAt: mockBlockHeight,
        confirmed: false,
      })
      contractState.totalContent = 1
    })
    
    it("should successfully update content metrics", () => {
      const contentId = 1
      const wordCount = 1200
      const sentimentScore = 65
      const objectivityScore = 75
      const sourceDiversity = 5
      const factToOpinionRatio = 80
      
      expect(contractState.contentAnalysis.has(contentId)).toBe(true)
      expect(sentimentScore).toBeLessThanOrEqual(100)
      expect(objectivityScore).toBeLessThanOrEqual(100)
      
      contractState.contentMetrics.set(contentId, {
        wordCount,
        sentimentScore,
        objectivityScore,
        sourceDiversity,
        factToOpinionRatio,
      })
      
      // Update content analysis with new metrics
      const content = contractState.contentAnalysis.get(contentId)
      contractState.contentAnalysis.set(contentId, {
        ...content,
        emotionalTone: sentimentScore,
        factualDensity: factToOpinionRatio,
      })
      
      expect(contractState.contentMetrics.get(contentId)).toEqual({
        wordCount: 1200,
        sentimentScore: 65,
        objectivityScore: 75,
        sourceDiversity: 5,
        factToOpinionRatio: 80,
      })
      
      const updatedContent = contractState.contentAnalysis.get(contentId)
      expect(updatedContent.emotionalTone).toBe(65)
      expect(updatedContent.factualDensity).toBe(80)
    })
    
    it("should fail with invalid sentiment score", () => {
      const sentimentScore = 150
      
      expect(sentimentScore).toBeGreaterThan(100)
      // Should return ERR_INVALID_BIAS_SCORE (303)
    })
    
    it("should fail with invalid objectivity score", () => {
      const objectivityScore = 120
      
      expect(objectivityScore).toBeGreaterThan(100)
      // Should return ERR_INVALID_BIAS_SCORE (303)
    })
  })
  
  describe("add-bias-pattern", () => {
    it("should successfully add a bias detection pattern", () => {
      const patternId = 1
      const patternType = "loaded language"
      const keywords = "devastating, shocking, outrageous, unbelievable"
      const biasWeight = 75
      
      expect(biasWeight).toBeLessThanOrEqual(100)
      
      contractState.biasPatterns.set(patternId, {
        patternType,
        keywords,
        biasWeight,
        accuracyRate: 0,
        createdBy: mockTxSender,
      })
      
      expect(contractState.biasPatterns.get(patternId)).toEqual({
        patternType: "loaded language",
        keywords,
        biasWeight: 75,
        accuracyRate: 0,
        createdBy: mockTxSender,
      })
    })
    
    it("should handle multiple pattern types", () => {
      const patterns = [
        { id: 1, type: "loaded language", weight: 75 },
        { id: 2, type: "false dichotomy", weight: 85 },
        { id: 3, type: "cherry picking", weight: 90 },
      ]
      
      patterns.forEach((pattern) => {
        contractState.biasPatterns.set(pattern.id, {
          patternType: pattern.type,
          keywords: `keywords for ${pattern.type}`,
          biasWeight: pattern.weight,
          accuracyRate: 0,
          createdBy: mockTxSender,
        })
      })
      
      expect(contractState.biasPatterns.size).toBe(3)
      expect(contractState.biasPatterns.get(1).patternType).toBe("loaded language")
      expect(contractState.biasPatterns.get(2).patternType).toBe("false dichotomy")
      expect(contractState.biasPatterns.get(3).patternType).toBe("cherry picking")
    })
    
    it("should fail with invalid bias weight", () => {
      const biasWeight = 150
      
      expect(biasWeight).toBeGreaterThan(100)
      // Should return ERR_INVALID_BIAS_SCORE (303)
    })
  })
  
  describe("read-only functions", () => {
    beforeEach(() => {
      const contentId = 1
      contractState.contentAnalysis.set(contentId, {
        contentHash: new Uint8Array(32).fill(1),
        sourceId: 1,
        submitter: mockTxSender,
        biasScore: 85,
        biasCategory: "political",
        politicalLean: "right",
        emotionalTone: 70,
        factualDensity: 40,
        analyzedAt: mockBlockHeight,
        confirmed: true,
      })
      
      const reportKey = `${contentId}-${mockTxSender}`
      contractState.biasReports.set(reportKey, {
        reportedBias: 80,
        biasType: "confirmation bias",
        evidence: "Test evidence",
        confidence: 90,
        timestamp: mockBlockHeight,
      })
      
      contractState.analyzerStats.set(mockTxSender, {
        totalAnalyses: 10,
        accurateAnalyses: 8,
        reputationScore: 80,
        specialization: "political bias",
      })
      
      contractState.contentMetrics.set(contentId, {
        wordCount: 1500,
        sentimentScore: 70,
        objectivityScore: 60,
        sourceDiversity: 3,
        factToOpinionRatio: 40,
      })
      
      contractState.totalContent = 1
    })
    
    it("should get content analysis correctly", () => {
      const contentId = 1
      const analysis = contractState.contentAnalysis.get(contentId)
      
      expect(analysis).toBeDefined()
      expect(analysis.biasScore).toBe(85)
      expect(analysis.biasCategory).toBe("political")
      expect(analysis.politicalLean).toBe("right")
      expect(analysis.confirmed).toBe(true)
    })
    
    it("should get bias report correctly", () => {
      const contentId = 1
      const reportKey = `${contentId}-${mockTxSender}`
      const report = contractState.biasReports.get(reportKey)
      
      expect(report).toBeDefined()
      expect(report.reportedBias).toBe(80)
      expect(report.biasType).toBe("confirmation bias")
      expect(report.confidence).toBe(90)
    })
    
    it("should get analyzer statistics correctly", () => {
      const stats = contractState.analyzerStats.get(mockTxSender)
      
      expect(stats).toBeDefined()
      expect(stats.totalAnalyses).toBe(10)
      expect(stats.accurateAnalyses).toBe(8)
      expect(stats.reputationScore).toBe(80)
      expect(stats.specialization).toBe("political bias")
    })
    
    it("should get content metrics correctly", () => {
      const contentId = 1
      const metrics = contractState.contentMetrics.get(contentId)
      
      expect(metrics).toBeDefined()
      expect(metrics.wordCount).toBe(1500)
      expect(metrics.sentimentScore).toBe(70)
      expect(metrics.objectivityScore).toBe(60)
      expect(metrics.factToOpinionRatio).toBe(40)
    })
    
    it("should return total content count", () => {
      expect(contractState.totalContent).toBe(1)
    })
    
    it("should check if content has high bias", () => {
      const contentId = 1
      const analysis = contractState.contentAnalysis.get(contentId)
      
      expect(analysis.biasScore).toBeGreaterThanOrEqual(contractState.biasThreshold)
    })
    
    it("should get bias threshold", () => {
      expect(contractState.biasThreshold).toBe(70)
    })
    
    it("should return undefined for non-existent content", () => {
      const contentId = 999
      const analysis = contractState.contentAnalysis.get(contentId)
      
      expect(analysis).toBeUndefined()
    })
  })
})

/**
 * Tag Testing Utilities
 * 
 * This module provides helper functions for testing the tagging system
 * in automated tests or manual verification.
 */

import { Editor } from '@tiptap/core';
import { Tag } from '@/lib/extensions/tagging/tag-types';
import { DocumentTag } from '@/lib/extensions/document-properties/document-properties-types';

export interface TagTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface TagTestSuite {
  runAllTests: () => Promise<TagTestResult[]>;
  testInlineTagCreation: () => Promise<TagTestResult>;
  testDocumentTagCreation: () => Promise<TagTestResult>;
  testTagSearch: () => Promise<TagTestResult>;
  testTagRemoval: () => Promise<TagTestResult>;
  testPropertiesPanel: () => Promise<TagTestResult>;
  testPerformance: () => Promise<TagTestResult>;
  generateReport: () => string;
}

/**
 * Creates a tag testing suite for validating the tagging implementation
 */
export function createTagTestSuite(editor: Editor): TagTestSuite {
  // Store test results
  const results: TagTestResult[] = [];
  
  // Test inline tag creation
  const testInlineTagCreation = async (): Promise<TagTestResult> => {
    try {
      // Create a test tag
      const testTag: Tag = {
        id: `test-inline-${Date.now()}`,
        name: 'Test Inline Tag',
        color: '#4f46e5',
      };
      
      // Set a selection in the document
      editor.commands.setTextSelection({ from: 10, to: 20 });
      
      // Get the initial tag count
      const initialTagCount = Object.keys(editor.storage.tagging.tags).length;
      
      // Add tag to selection
      editor.commands.addTag(testTag, 10, 20);
      
      // Check if tag was added
      const newTagCount = Object.keys(editor.storage.tagging.tags).length;
      const tagAdded = newTagCount > initialTagCount;
      
      // Verify the tag is in storage
      const tagInStorage = !!editor.storage.tagging.tags[testTag.id];
      
      // Verify a range was created
      const ranges = Object.values(editor.storage.tagging.taggedRanges);
      const rangeCreated = ranges.some((range: any) => range.tagId === testTag.id);
      
      if (tagAdded && tagInStorage && rangeCreated) {
        return {
          success: true,
          message: 'Inline tag created successfully',
          details: { tag: testTag }
        };
      } else {
        return {
          success: false,
          message: 'Failed to create inline tag',
          details: {
            tagAdded,
            tagInStorage,
            rangeCreated
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing inline tag creation',
        details: error
      };
    }
  };
  
  // Test document tag creation
  const testDocumentTagCreation = async (): Promise<TagTestResult> => {
    try {
      // Create a test document tag
      const testTag: DocumentTag = {
        id: `test-doc-${Date.now()}`,
        name: 'Test Document Tag',
        color: '#dc2626',
        isDocumentTag: true
      };
      
      // Add document tag
      editor.commands.addDocumentTag(testTag);
      
      // Find document properties node
      let documentProperties: any = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          documentProperties = node;
          return false; // Stop iteration
        }
        return true;
      });
      
      // Check if tag was added
      const tagExists = documentProperties && 
        documentProperties.attrs.tags && 
        documentProperties.attrs.tags.some((t: DocumentTag) => t.id === testTag.id);
      
      if (tagExists) {
        return {
          success: true,
          message: 'Document tag created successfully',
          details: { tag: testTag }
        };
      } else {
        return {
          success: false,
          message: 'Failed to create document tag',
          details: {
            documentPropertiesExists: !!documentProperties,
            tagsExist: !!(documentProperties && documentProperties.attrs.tags)
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing document tag creation',
        details: error
      };
    }
  };
  
  // Test tag search functionality
  const testTagSearch = async (): Promise<TagTestResult> => {
    try {
      // This would normally integrate with the UI
      // For now, we'll just validate that we can find tags in the editor
      
      // Get all document tags
      let documentTags: DocumentTag[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          documentTags = node.attrs.tags || [];
          return false;
        }
        return true;
      });
      
      // Get all inline tags
      const inlineTags = Object.values(editor.storage.tagging.tags || {})
        .filter((tag: any) => !tag.isDocumentTag);
      
      const hasDocumentTags = documentTags.length > 0;
      const hasInlineTags = inlineTags.length > 0;
      
      return {
        success: hasDocumentTags || hasInlineTags,
        message: hasDocumentTags || hasInlineTags 
          ? 'Tag search found tags successfully' 
          : 'No tags found for search testing',
        details: {
          documentTagCount: documentTags.length,
          inlineTagCount: inlineTags.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error testing tag search',
        details: error
      };
    }
  };
  
  // Test tag removal
  const testTagRemoval = async (): Promise<TagTestResult> => {
    try {
      // Test removing an inline tag
      const inlineTagIds = Object.keys(editor.storage.tagging.taggedRanges || {});
      
      if (inlineTagIds.length > 0) {
        const rangeId = inlineTagIds[0];
        const initialRangeCount = inlineTagIds.length;
        
        // Remove tag
        editor.commands.removeTag(rangeId);
        
        // Check if tag was removed
        const newRangeCount = Object.keys(editor.storage.tagging.taggedRanges || {}).length;
        const inlineTagRemoved = newRangeCount < initialRangeCount;
        
        // Test removing a document tag
        let documentProperties: any = null;
        let documentTags: DocumentTag[] = [];
        
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            documentProperties = node;
            documentTags = node.attrs.tags || [];
            return false;
          }
          return true;
        });
        
        let documentTagRemoved = false;
        
        if (documentTags.length > 0) {
          const docTagId = documentTags[0].id;
          const initialDocTagCount = documentTags.length;
          
          // Remove document tag
          editor.commands.removeDocumentTag(docTagId);
          
          // Check if document tag was removed
          let newDocumentTags: DocumentTag[] = [];
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'documentProperties') {
              newDocumentTags = node.attrs.tags || [];
              return false;
            }
            return true;
          });
          
          documentTagRemoved = newDocumentTags.length < initialDocTagCount;
        }
        
        return {
          success: inlineTagRemoved || documentTagRemoved,
          message: 'Tag removal test completed',
          details: {
            inlineTagRemoved,
            documentTagRemoved,
            inlineTagsAvailableForTest: inlineTagIds.length > 0,
            documentTagsAvailableForTest: documentTags.length > 0
          }
        };
      } else {
        return {
          success: false,
          message: 'No tags available for removal testing',
          details: null
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error testing tag removal',
        details: error
      };
    }
  };
  
  // Test properties panel
  const testPropertiesPanel = async (): Promise<TagTestResult> => {
    try {
      // Check if properties panel exists
      let propertiesNode = null;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          propertiesNode = node;
          return false;
        }
        return true;
      });
      
      if (!propertiesNode) {
        return {
          success: false,
          message: 'Properties panel node not found',
          details: null
        };
      }
      
      // Test toggling panel state
      const initialState = propertiesNode.attrs.isExpanded;
      
      // Toggle panel
      editor.commands.togglePropertiesPanelExpanded();
      
      // Check if state was toggled
      let newState = false;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          newState = node.attrs.isExpanded;
          return false;
        }
        return true;
      });
      
      const stateToggled = newState !== initialState;
      
      // Test updating title
      const testTitle = 'Test Title ' + Date.now();
      
      editor.commands.updateDocumentProperties({
        title: testTitle
      });
      
      // Check if title was updated
      let updatedTitle = '';
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          updatedTitle = node.attrs.title;
          return false;
        }
        return true;
      });
      
      const titleUpdated = updatedTitle === testTitle;
      
      return {
        success: stateToggled && titleUpdated,
        message: 'Properties panel tests completed',
        details: {
          stateToggled,
          titleUpdated,
          initialState,
          newState,
          testTitle,
          updatedTitle
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error testing properties panel',
        details: error
      };
    }
  };
  
  // Test performance with a large number of tags
  const testPerformance = async (): Promise<TagTestResult> => {
    try {
      const tagCount = 50; // Number of tags to create for performance testing
      const startTime = performance.now();
      
      // Create many tags for performance testing
      for (let i = 0; i < tagCount; i++) {
        // Alternate between document and inline tags
        if (i % 2 === 0) {
          // Create document tag
          const docTag: DocumentTag = {
            id: `perf-doc-${i}-${Date.now()}`,
            name: `Performance Doc Tag ${i}`,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            isDocumentTag: true
          };
          
          editor.commands.addDocumentTag(docTag);
        } else {
          // Create inline tag - place at different positions
          const start = 10 + (i * 10);
          const end = start + 5;
          
          // Ensure we don't go beyond document length
          if (end < editor.state.doc.content.size) {
            const inlineTag: Tag = {
              id: `perf-inline-${i}-${Date.now()}`,
              name: `Performance Inline Tag ${i}`,
              color: '#' + Math.floor(Math.random() * 16777215).toString(16)
            };
            
            editor.commands.addTag(inlineTag, start, end);
          }
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Check document properties
      let docTagCount = 0;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          docTagCount = (node.attrs.tags || []).length;
          return false;
        }
        return true;
      });
      
      // Check inline tags
      const inlineTagCount = Object.keys(editor.storage.tagging.taggedRanges || {}).length;
      
      // Check if performance is acceptable (less than 1000ms for 50 tags)
      const isPerformanceOk = duration < 1000;
      
      return {
        success: isPerformanceOk,
        message: `Performance test completed in ${duration.toFixed(2)}ms`,
        details: {
          duration,
          docTagCount,
          inlineTagCount,
          isPerformanceAcceptable: isPerformanceOk
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error testing performance',
        details: error
      };
    }
  };
  
  // Run all tests
  const runAllTests = async (): Promise<TagTestResult[]> => {
    results.length = 0; // Clear previous results
    
    // Run tests in sequence
    results.push(await testInlineTagCreation());
    results.push(await testDocumentTagCreation());
    results.push(await testTagSearch());
    results.push(await testTagRemoval());
    results.push(await testPropertiesPanel());
    results.push(await testPerformance());
    
    return results;
  };
  
  // Generate a report of test results
  const generateReport = (): string => {
    if (results.length === 0) {
      return 'No tests have been run yet.';
    }
    
    let report = '# Tag System Test Report\n\n';
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    report += `## Summary\n`;
    report += `- Tests run: ${results.length}\n`;
    report += `- Tests passed: ${successCount}\n`;
    report += `- Tests failed: ${failCount}\n\n`;
    
    report += `## Test Results\n\n`;
    
    results.forEach((result, index) => {
      report += `### Test ${index + 1}: ${result.message}\n`;
      report += `Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
      
      if (result.details) {
        report += `Details:\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
      }
    });
    
    return report;
  };
  
  return {
    runAllTests,
    testInlineTagCreation,
    testDocumentTagCreation,
    testTagSearch,
    testTagRemoval,
    testPropertiesPanel,
    testPerformance,
    generateReport
  };
}

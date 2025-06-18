import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Get user settings from Supabase
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('shopify_store, shopify_access_token, shopify_product_id')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Shopify credentials not configured. Please configure your settings first.' },
        { status: 400 }
      );
    }

    const { shopify_store: shopifyStore, shopify_access_token: shopifyAccessToken, shopify_product_id: shopifyProductId } = settings;

    if (!shopifyStore || !shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify credentials incomplete. Please check your settings.' },
        { status: 400 }
      );
    }

    // Download the image
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Convert buffer to base64 for Shopify API
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    let uploadResult;

    if (shopifyProductId) {
      // Upload as product image
      const productImageData = {
        image: {
          attachment: base64Image,
          filename: image.filename,
          alt: image.filename.replace(/\.[^/.]+$/, ""), // Remove file extension for alt text
        }
      };

      const uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/products/${shopifyProductId}/images.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productImageData),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Shopify product image upload error:', errorText);
        throw new Error(`Failed to upload to Shopify product: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      uploadResult = await uploadResponse.json();
      
      return NextResponse.json({
        success: true,
        imageId: uploadResult.image.id,
        productId: uploadResult.image.product_id,
        url: uploadResult.image.src,
        altText: uploadResult.image.alt,
        type: 'product_image'
      });
    } else {
            // Upload to Content -> Files using the proper Shopify Files API
      // Try multiple approaches to ensure it goes to the Files section
      
      let uploadResponse;
      let uploadMethod = '';
      
      // Method 1: Use the correct approach - upload to Files using staged upload
      // First, create a staged upload target
      const stagedUploadQuery = `
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const stagedUploadVariables = {
        input: [
          {
            resource: "FILE",
            filename: image.filename,
            mimeType: contentType,
            httpMethod: "POST"
          }
        ]
      };

      let stagedResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: stagedUploadQuery,
          variables: stagedUploadVariables
        }),
      });

      console.log('Staged upload response status:', stagedResponse.status);

      if (stagedResponse.ok) {
        const stagedResult = await stagedResponse.json();
        console.log('Staged upload result:', JSON.stringify(stagedResult, null, 2));
        
        if (stagedResult.data?.stagedUploadsCreate?.stagedTargets?.length > 0) {
          const stagedTarget = stagedResult.data.stagedUploadsCreate.stagedTargets[0];
          
          // Upload the file to the staged target
          const formData = new FormData();
          
          // Add all the required parameters from Shopify
          stagedTarget.parameters.forEach((param: any) => {
            formData.append(param.name, param.value);
          });
          
          // Convert base64 to blob and add the file
          const byteCharacters = atob(base64Image);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          formData.append('file', blob, image.filename);
          
          const uploadToStaged = await fetch(stagedTarget.url, {
            method: 'POST',
            body: formData,
          });
          
          console.log('Upload to staged response status:', uploadToStaged.status);
          
          if (uploadToStaged.ok) {
            // Now create the file record in Shopify
            const fileCreateQuery = `
              mutation fileCreate($files: [FileCreateInput!]!) {
                fileCreate(files: $files) {
                  files {
                    id
                    fileStatus
                    ... on MediaImage {
                      id
                      image {
                        url
                        width
                        height
                      }
                      mimeType
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;

            const fileCreateVariables = {
              files: [
                {
                  alt: image.filename.replace(/\.[^/.]+$/, ""),
                  contentType: "IMAGE",
                  originalSource: stagedTarget.resourceUrl
                }
              ]
            };

            const fileCreateResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/graphql.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': shopifyAccessToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: fileCreateQuery,
                variables: fileCreateVariables
              }),
            });

            if (fileCreateResponse.ok) {
              const fileResult = await fileCreateResponse.json();
              console.log('File create result:', JSON.stringify(fileResult, null, 2));
              
              if (fileResult.data?.fileCreate?.files?.length > 0 && !fileResult.data.fileCreate.userErrors?.length) {
                const file = fileResult.data.fileCreate.files[0];
                return NextResponse.json({
                  success: true,
                  uploadMethod: 'GraphQL Staged Upload',
                  fileId: file.id,
                  url: file.image?.url,
                  filename: file.filename || image.filename,
                  width: file.image?.width,
                  height: file.image?.height,
                  mimeType: file.mimeType,
                  type: 'file',
                  location: 'Content → Files',
                  instructions: 'File uploaded to Content → Files. Go to Content → Files in your Shopify admin to find your file.'
                });
              } else if (fileResult.data?.fileCreate?.userErrors?.length > 0) {
                console.log('File create errors:', fileResult.data.fileCreate.userErrors);
              }
            } else {
              console.log('File create response failed:', fileCreateResponse.status);
              const errorText = await fileCreateResponse.text();
              console.log('File create error:', errorText);
            }
          } else {
            console.log('Upload to staged failed:', uploadToStaged.status);
            const errorText = await uploadToStaged.text();
            console.log('Staged upload error:', errorText);
          }
        } else {
          console.log('No staged targets received');
        }
      } else {
        console.log('Staged response failed:', stagedResponse.status);
        const errorText = await stagedResponse.text();
        console.log('Staged response error:', errorText);
      }

      // Method 2: Try REST API with proper file format
      const fileUploadData = {
        file: {
          attachment: base64Image,
          filename: image.filename,
          content_type: contentType
        }
      };

      uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/files.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fileUploadData),
      });

      uploadMethod = 'REST Files API 2024-01';

      // Method 3: Try older API version
      if (!uploadResponse.ok) {
        console.log('Modern API failed, trying 2023-10 API version');
        uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2023-10/files.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fileUploadData),
        });
        uploadMethod = 'REST Files API 2023-10';
      }

      // If still failing, try uploading as an asset to a theme
      if (!uploadResponse.ok) {
        console.log('Files API failed, trying theme asset upload');
        
        // Get the published theme first
        const themesResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/themes.json?role=main`, {
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
          },
        });

        if (themesResponse.ok) {
          const themesData = await themesResponse.json();
          const mainTheme = themesData.themes?.[0];
          
          if (mainTheme) {
            const assetData = {
              asset: {
                key: `assets/${image.filename}`,
                attachment: base64Image,
              }
            };

            uploadResponse = await fetch(`https://${shopifyStore}/admin/api/2024-01/themes/${mainTheme.id}/assets.json`, {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': shopifyAccessToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(assetData),
            });

                         if (uploadResponse.ok) {
               uploadResult = await uploadResponse.json();
               return NextResponse.json({
                 success: true,
                 uploadMethod: 'Theme Asset',
                 themeId: mainTheme.id,
                 themeName: mainTheme.name,
                 key: uploadResult.asset.key,
                 url: `https://${shopifyStore}/${uploadResult.asset.key}`,
                 size: uploadResult.asset.size,
                 type: 'theme_asset',
                 location: `Theme: ${mainTheme.name} > Assets > ${image.filename}`,
                 instructions: 'File uploaded as theme asset. Go to Online Store > Themes > Actions > Edit Code > Assets to find your file.'
               });
             }
          }
        }
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('All Shopify upload methods failed:', errorText);
        throw new Error(`Failed to upload to Shopify: ${uploadResponse.status} ${uploadResponse.statusText}. Error: ${errorText}`);
      }

             if (uploadResponse.ok) {
         uploadResult = await uploadResponse.json();
         
         return NextResponse.json({
           success: true,
           uploadMethod: uploadMethod,
           fileId: uploadResult.file?.id || uploadResult.id,
           url: uploadResult.file?.url || uploadResult.url,
           filename: uploadResult.file?.filename || image.filename,
           size: uploadResult.file?.size || null,
           type: 'file',
           location: 'Content → Files',
           instructions: 'File uploaded to Content → Files. Go to Content → Files in your Shopify admin to find your file.'
         });
       }
    }
  } catch (error) {
    console.error('Shopify upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload to Shopify' },
      { status: 500 }
    );
  }
} 
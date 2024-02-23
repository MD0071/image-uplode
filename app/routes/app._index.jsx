import React, { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  DropZone,
  LegacyStack,
  Thumbnail,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { uploadFile } from "./models/files.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const requestBody = await request.text();
  console.log(
    "start:----------------------------------------------------------------------------------",
  );
  const formData = new URLSearchParams(requestBody);
  const finalFile = formData.get("finalFile");
  const files = formData.get("files");
  const JsonFileData = JSON.parse(finalFile);
  console.log(JsonFileData, "🤦‍♂️🤦‍♂️🤦‍♂️");
  const result = await uploadFile(JsonFileData, admin.graphql);
  console.log(result, "😅");
  const productResponse = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
        },
      },
    },
  );

  const productResponseJson = await productResponse.json();

  const productId = productResponseJson.data?.productCreate?.product?.id;

  // Add image to the product
  const imageResponse = await admin.graphql(
    `mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
      productCreateMedia(media: $media, productId: $productId) {
        media {
          alt
          mediaContentType
          status
        }
        mediaUserErrors {
          field
          message
        }
        product {
          id
          title
        }
      }
    }`,
    {
      variables: {
        media: {
          alt: "Image",
          mediaContentType: "IMAGE",
          originalSource: "resourceurl",
        },
        productId: productId,
      },
    },
  );
  const imageResponseJson = await imageResponse.json();
  console.log(
    "end:----------------------------------------------------------------------------------",
  );

  return json({
    product: {
      id: productId,
      imageResponseJson: imageResponseJson,
    },
  });
};

const Index = () => {
  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const productId = actionData?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId]);
  const [files, setFiles] = useState([]);

  const handleDropZoneDrop = useCallback(
    async (_dropFiles, acceptedFiles, _rejectedFiles) => {
      const formData = new FormData();

      if (acceptedFiles.length) {
        setFiles(acceptedFiles);
      }

      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await fetch("/file", {
        method: "POST",
        headers: {
          contentType: "multipart/form-data",
        },
        body: formData,
      });
    },
    [],
  );
  const validImageTypes = ["image/gif", "image/jpeg", "image/png"];

  const fileUpload = !files.length && <DropZone.FileUpload />;
  const uploadedFiles = files.length > 0 && (
    <div style={{ padding: "0" }}>
      <LegacyStack vertical>
        {files.map((file, index) => (
          <LegacyStack alignment="center" key={index}>
            <Thumbnail
              size="small"
              alt={file.name}
              source={
                validImageTypes.includes(file.type)
                  ? window.URL.createObjectURL(file)
                  : ""
              }
            />
            <div>
              {file.name}{" "}
              <Text variant="bodySm" as="p">
                {file.size} bytes
              </Text>
            </div>
          </LegacyStack>
        ))}
      </LegacyStack>
    </div>
  );
  console.log(files);
  const stringFiles = files.map((file) => {
    return {
      name: file.name,
      lastModified: file.lastModified,
      lastModifiedDate: file.lastModifiedDate,
      size: file.size,
      type: file.type,
      webkitRelativePath: file.webkitRelativePath,
    };
  });

  const finalFile = JSON.stringify(stringFiles);
  const generateProduct = () => {
    const filename = files[0]?.name;
    const filetype = files[0]?.type;
    const filesize = files[0]?.size;
    submit(
      { finalFile, filename, filetype, filesize, files },
      { replace: true, method: "POST" },
    );
  };

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap="300">
                <DropZone onDrop={handleDropZoneDrop}>
                  {uploadedFiles}
                  {fileUpload}
                </DropZone>
                <Button loading={isLoading} onClick={generateProduct}>
                  Generate a product
                </Button>
                {actionData?.product && (
                  <Button
                    url={`shopify:admin/products/${productId}`}
                    target="_blank"
                    variant="plain"
                  >
                    View product
                  </Button>
                )}
              </InlineStack>
              {actionData?.imageUserErrors && (
                <Box>
                  <p>Errors occurred while adding image:</p>
                  <ul>
                    {actionData.imageUserErrors.map((error, index) => (
                      <li key={index}>
                        <strong>{error.field}: </strong>
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
};

export default Index;

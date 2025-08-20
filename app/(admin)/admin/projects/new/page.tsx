"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchema, type ProjectFormData } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function NewProjectPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      featured: false,
      type: "Residential",
      images: [],
      mainImage: "",
    },
  });

  const featured = watch("featured");
  const type = watch("type");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const json = await response.json();
        const imageUrl = json.url || json.secure_url;
        if (!imageUrl) continue;

        // Update local state
        const updatedImages = [...uploadedImages, imageUrl];
        setUploadedImages(updatedImages);

        // Update form state for validation
        setValue("images", updatedImages, { shouldValidate: true });
        if (updatedImages.length === 1) {
          // First image becomes main by default
          setMainImageIndex(0);
          setValue("mainImage", imageUrl, { shouldValidate: true });
        }
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updatedImages);
    setValue("images", updatedImages, { shouldValidate: true });

    if (mainImageIndex === index) {
      // Reset main image if removed
      const newMainIndex = updatedImages.length > 0 ? 0 : -1;
      setMainImageIndex(newMainIndex);
      setValue("mainImage", updatedImages[newMainIndex] || "", {
        shouldValidate: true,
      });
    } else if (mainImageIndex > index) {
      setMainImageIndex((prev) => prev - 1);
    }
  };

  const handleSetMainImage = (index: number) => {
    setMainImageIndex(index);
    setValue("mainImage", uploadedImages[index], { shouldValidate: true });
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (uploadedImages.length === 0) {
      setSubmitStatus("error");
      setErrorMessage(
        "Please upload at least one image before creating the project."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage("");

    try {
      const projectData = {
        ...data,
        images: uploadedImages,
        mainImage: uploadedImages[mainImageIndex] || uploadedImages[0],
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setSubmitStatus("error");
        setErrorMessage(
          errorData.error || `Request failed with status ${response.status}`
        );
        return;
      }

      setSubmitStatus("success");
      setErrorMessage("");
      setTimeout(() => {
        router.push("/admin/projects");
      }, 2000);
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Project</h1>
          <p className="text-muted-foreground">
            Create a new interior design project
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Hidden fields to make RHF aware of them */}
        <input type="hidden" {...register("type")} value={type} />
        <input
          type="hidden"
          {...register("featured")}
          value={featured?.toString() || "false"}
        />
        <input type="hidden" {...register("images")} />
        <input type="hidden" {...register("mainImage")} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submitStatus === "success" && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      Project created successfully! Redirecting...
                    </AlertDescription>
                  </Alert>
                )}
                {submitStatus === "error" && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {errorMessage ||
                        "There was an error creating the project."}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="Modern Luxury Villa"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="type">Project Type *</Label>
                    <Select
                      defaultValue="Residential"
                      onValueChange={(value) =>
                        setValue(
                          "type",
                          value as "Residential" | "Commercial" | "Hospitality"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residential">Residential</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Hospitality">Hospitality</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-red-500">
                        {errors.type.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      {...register("location")}
                      placeholder="Beverly Hills, CA"
                    />
                    {errors.location && (
                      <p className="text-sm text-red-500">
                        {errors.location.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Input
                      id="client"
                      {...register("client")}
                      placeholder="Private Residence"
                    />
                    {errors.client && (
                      <p className="text-sm text-red-500">
                        {errors.client.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">Completion Date *</Label>
                  <Input id="date" type="date" {...register("date")} />
                  {errors.date && (
                    <p className="text-sm text-red-500">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Short Description *</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fullDescription">Full Description</Label>
                  <Textarea
                    id="fullDescription"
                    {...register("fullDescription")}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Project Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload project images (JPG, PNG up to 10MB each)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    hidden
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                    variant="outline"
                  >
                    Choose Images
                  </Button>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="relative aspect-square rounded-lg overflow-hidden">
                          <Image
                            src={image}
                            alt={`Upload ${index + 1}`}
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {index === mainImageIndex && (
                            <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded text-xs">
                              Main
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleSetMainImage(index)}
                          disabled={index === mainImageIndex}
                        >
                          {index === mainImageIndex
                            ? "Main Image"
                            : "Set as Main"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publish Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">Featured Project</Label>
                  <Switch
                    id="featured"
                    checked={featured}
                    onCheckedChange={(checked) => setValue("featured", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || uploadedImages.length === 0}
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/admin/projects">Cancel</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

curl -s -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/seo-genie-494023/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/12345"

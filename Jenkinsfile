pipeline {
    agent { label 'deploy' }

    environment {
        SONARQUBE = credentials('sonar-token')
        SCANNER_HOME = tool 'SonarScanner'
        BUCKET_NAME = 'trivy-logs-forcastify'
        SONAR_HOST_URL = 'http://13.234.152.9:9000'
    }

    stages {

        stage('Pull OR Clone the Code') {
            steps {
                git branch: 'main', url: 'https://github.com/Harsh-Basatwar/forecastify.git'
            }
        }

        stage('Code Quality & Unit Test') {
            steps {
                sh '''
                npm ci || npm install
                npm run lint || true
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                    ${SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.projectKey=forecastify \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=${SONAR_HOST_URL} \
                    '''
                }
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                trivy fs --severity HIGH,CRITICAL --skip-files .env --skip-files env.txt --exit-code 1 --no-progress .
                '''
            }
        }

        stage('Trivy Scan Report') {
            steps {
                sh '''
                trivy fs --format template --template "@scripts/html.tpl" -o trivy-report.html --skip-files .env --skip-files env.txt .
                '''
            }
        }

        stage('Upload to S3') {
            steps {
                sh '''
                aws s3 cp trivy-report.html s3://$BUCKET_NAME/trivy-report-${BUILD_NUMBER}.html || true
                '''
            }
        }

        stage('Inject Env File') {
            steps {
                withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE')]) {
                    sh '''
                    rm -f .env
                    cp $ENV_FILE .env
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                docker build \
                  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
                  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
                  -t forecastify .
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                trivy image --severity HIGH,CRITICAL --no-progress forecastify || true
                '''
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    docker tag forecastify $DOCKER_USER/forecastify:${BUILD_NUMBER}
                    docker tag forecastify $DOCKER_USER/forecastify:latest
                    docker push $DOCKER_USER/forecastify:${BUILD_NUMBER}
                    docker push $DOCKER_USER/forecastify:latest
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                    # 1. Ensure Namespace & Secrets exist
                    kubectl create namespace forecastify-prod --dry-run=client -o yaml | kubectl apply -f -
                    kubectl create secret generic forecastify-secrets --from-env-file=.env -n forecastify-prod --dry-run=client -o yaml | kubectl apply -f -

                    # 2. Dynamically set container image tag using Kustomize
                    cd k8s/overlays/production
                    kustomize edit set image heavenledemon60/forecastify=$DOCKER_USER/forecastify:${BUILD_NUMBER}
                    kubectl apply -k .

                    # 3. Verify Rollout Status for active frontend deployment
                    kubectl rollout status deployment/forecastify-frontend -n forecastify-prod --timeout=120s
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'trivy-report.html', fingerprint: true
            sh 'rm -f .env'
        }
        success {
            echo '✅ Forecastify Kubernetes Pipeline completed successfully!'
        }
        failure {
            echo '❌ Forecastify Pipeline failed!'
        }
    }
}

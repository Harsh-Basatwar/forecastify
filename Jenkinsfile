pipeline {
    agent { label 'deploy' }

    environment {
        SONARQUBE = credentials('sonar-token')
        SCANNER_HOME = tool 'SonarScanner'
        BUCKET_NAME = 'trivy-logs-forcastify'
    }

    stages {

        stage('Pull OR Clone the Code') {
            steps {
                git branch: 'main', url: 'https://github.com/Harsh-Basatwar/forecastify.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                    ${SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.projectKey=forecastify \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=http://13.234.152.9:9000 \
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
                curl -sLO https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/html.tpl
                trivy fs --format template --template "@html.tpl" -o trivy-report.html --skip-files .env --skip-files env.txt .
                '''
            }
        }

        stage('Upload to S3') {
            steps {
                sh '''
                aws s3 cp trivy-report.html s3://$BUCKET_NAME/trivy-report-${BUILD_NUMBER}.html
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
                sh 'docker build -t forecastify .'
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

                    # 2. Deploy using Kustomize Production Overlay
                    cd k8s/overlays/production
                    kubectl apply -k .

                    # 3. Verify Rollout Status
                    kubectl rollout status deployment/forecastify-frontend -n forecastify-prod --timeout=120s
                    kubectl rollout status deployment/forecastify-api -n forecastify-prod --timeout=120s
                    kubectl rollout status deployment/forecastify-jarvis -n forecastify-prod --timeout=120s
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

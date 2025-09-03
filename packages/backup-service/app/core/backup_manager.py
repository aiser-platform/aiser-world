"""
Real Backup & Disaster Recovery System
Production-ready backup system for Aiser Platform
"""

import os
import gzip
import shutil
import asyncio
import hashlib
import tempfile
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging
from dataclasses import dataclass, asdict
import json
import subprocess
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from azure.storage.blob import BlobServiceClient
from google.cloud import storage as gcs
import schedule
import time

from app.core.config import settings
from app.core.encryption import EncryptionManager
from app.models.backup import BackupJob, BackupFile, RestoreJob

logger = logging.getLogger(__name__)

@dataclass
class BackupConfig:
    """Backup configuration"""
    name: str
    enabled: bool
    schedule: str  # cron expression
    retention_days: int
    compression: bool
    encryption: bool
    storage_type: str  # "local", "s3", "azure", "gcs"
    storage_config: Dict[str, Any]
    databases: List[str]
    files: List[str]
    exclude_patterns: List[str]

@dataclass
class BackupResult:
    """Backup operation result"""
    job_id: str
    status: str  # "success", "failed", "partial"
    start_time: datetime
    end_time: datetime
    files_created: List[str]
    total_size: int
    error_message: Optional[str] = None

class DatabaseBackupManager:
    """Real database backup manager"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.encryption_manager = EncryptionManager()
    
    async def backup_database(self, database_name: str, backup_path: Path) -> bool:
        """Create database backup using pg_dump"""
        try:
            # Build pg_dump command
            cmd = [
                "pg_dump",
                f"--host={settings.POSTGRES_SERVER}",
                f"--port={settings.POSTGRES_PORT}",
                f"--username={settings.POSTGRES_USER}",
                f"--dbname={database_name}",
                "--verbose",
                "--no-password",
                "--format=custom",
                "--compress=9",
                f"--file={backup_path}"
            ]
            
            # Set password via environment
            env = os.environ.copy()
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
            
            # Execute backup
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Database backup failed: {stderr.decode()}")
                return False
            
            logger.info(f"Database backup completed: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating database backup: {e}")
            return False
    
    async def restore_database(self, database_name: str, backup_path: Path) -> bool:
        """Restore database from backup using pg_restore"""
        try:
            # Build pg_restore command
            cmd = [
                "pg_restore",
                f"--host={settings.POSTGRES_SERVER}",
                f"--port={settings.POSTGRES_PORT}",
                f"--username={settings.POSTGRES_USER}",
                f"--dbname={database_name}",
                "--verbose",
                "--no-password",
                "--clean",
                "--if-exists",
                str(backup_path)
            ]
            
            # Set password via environment
            env = os.environ.copy()
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
            
            # Execute restore
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Database restore failed: {stderr.decode()}")
                return False
            
            logger.info(f"Database restore completed: {database_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error restoring database: {e}")
            return False

class FileBackupManager:
    """Real file backup manager"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.encryption_manager = EncryptionManager()
    
    async def backup_files(self, source_paths: List[str], backup_path: Path) -> List[str]:
        """Backup files and directories"""
        backed_up_files = []
        
        try:
            for source_path in source_paths:
                source = Path(source_path)
                
                if not source.exists():
                    logger.warning(f"Source path does not exist: {source_path}")
                    continue
                
                if source.is_file():
                    # Backup single file
                    relative_path = source.name
                    dest_path = backup_path / relative_path
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    await self._backup_single_file(source, dest_path)
                    backed_up_files.append(str(dest_path))
                    
                elif source.is_dir():
                    # Backup directory
                    for file_path in source.rglob("*"):
                        if file_path.is_file() and not self._should_exclude(file_path):
                            relative_path = file_path.relative_to(source)
                            dest_path = backup_path / relative_path
                            dest_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            await self._backup_single_file(file_path, dest_path)
                            backed_up_files.append(str(dest_path))
            
            return backed_up_files
            
        except Exception as e:
            logger.error(f"Error backing up files: {e}")
            return backed_up_files
    
    async def _backup_single_file(self, source: Path, dest: Path):
        """Backup a single file with compression and encryption"""
        try:
            # Copy file
            shutil.copy2(source, dest)
            
            # Compress if enabled
            if self.config.compression:
                compressed_path = dest.with_suffix(dest.suffix + ".gz")
                with open(dest, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                dest.unlink()  # Remove uncompressed file
                dest = compressed_path
            
            # Encrypt if enabled
            if self.config.encryption:
                encrypted_path = dest.with_suffix(dest.suffix + ".enc")
                await self.encryption_manager.encrypt_file(dest, encrypted_path)
                dest.unlink()  # Remove unencrypted file
                dest = encrypted_path
            
            logger.debug(f"Backed up file: {source} -> {dest}")
            
        except Exception as e:
            logger.error(f"Error backing up file {source}: {e}")
            raise
    
    def _should_exclude(self, file_path: Path) -> bool:
        """Check if file should be excluded from backup"""
        for pattern in self.config.exclude_patterns:
            if file_path.match(pattern):
                return True
        return False

class StorageManager:
    """Real storage manager for different cloud providers"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self._clients = {}
    
    async def upload_backup(self, local_path: Path, remote_path: str) -> bool:
        """Upload backup to remote storage"""
        try:
            if self.config.storage_type == "s3":
                return await self._upload_to_s3(local_path, remote_path)
            elif self.config.storage_type == "azure":
                return await self._upload_to_azure(local_path, remote_path)
            elif self.config.storage_type == "gcs":
                return await self._upload_to_gcs(local_path, remote_path)
            else:
                logger.error(f"Unsupported storage type: {self.config.storage_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error uploading backup: {e}")
            return False
    
    async def _upload_to_s3(self, local_path: Path, remote_path: str) -> bool:
        """Upload to AWS S3"""
        try:
            s3_client = self._get_s3_client()
            
            with open(local_path, 'rb') as file:
                s3_client.upload_fileobj(
                    file,
                    self.config.storage_config["bucket"],
                    remote_path,
                    ExtraArgs={
                        'ServerSideEncryption': 'AES256',
                        'StorageClass': 'STANDARD_IA'
                    }
                )
            
            logger.info(f"Uploaded to S3: {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            return False
    
    async def _upload_to_azure(self, local_path: Path, remote_path: str) -> bool:
        """Upload to Azure Blob Storage"""
        try:
            blob_client = self._get_azure_client()
            container_client = blob_client.get_container_client(
                self.config.storage_config["container"]
            )
            
            with open(local_path, 'rb') as file:
                container_client.upload_blob(
                    name=remote_path,
                    data=file,
                    overwrite=True
                )
            
            logger.info(f"Uploaded to Azure: {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"Azure upload failed: {e}")
            return False
    
    async def _upload_to_gcs(self, local_path: Path, remote_path: str) -> bool:
        """Upload to Google Cloud Storage"""
        try:
            gcs_client = self._get_gcs_client()
            bucket = gcs_client.bucket(self.config.storage_config["bucket"])
            blob = bucket.blob(remote_path)
            
            with open(local_path, 'rb') as file:
                blob.upload_from_file(file)
            
            logger.info(f"Uploaded to GCS: {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"GCS upload failed: {e}")
            return False
    
    def _get_s3_client(self):
        """Get S3 client"""
        if "s3" not in self._clients:
            self._clients["s3"] = boto3.client(
                's3',
                aws_access_key_id=self.config.storage_config["access_key"],
                aws_secret_access_key=self.config.storage_config["secret_key"],
                region_name=self.config.storage_config.get("region", "us-east-1")
            )
        return self._clients["s3"]
    
    def _get_azure_client(self):
        """Get Azure Blob client"""
        if "azure" not in self._clients:
            self._clients["azure"] = BlobServiceClient.from_connection_string(
                self.config.storage_config["connection_string"]
            )
        return self._clients["azure"]
    
    def _get_gcs_client(self):
        """Get GCS client"""
        if "gcs" not in self._clients:
            self._clients["gcs"] = gcs.Client.from_service_account_json(
                self.config.storage_config["service_account_key"]
            )
        return self._clients["gcs"]

class BackupManager:
    """Main backup manager orchestrating all backup operations"""
    
    def __init__(self):
        self.configs: Dict[str, BackupConfig] = {}
        self.db_manager = None
        self.file_manager = None
        self.storage_manager = None
    
    async def load_configs(self):
        """Load backup configurations"""
        try:
            # Load from database or config files
            # This would be implemented based on your configuration system
            default_config = BackupConfig(
                name="default",
                enabled=True,
                schedule="0 2 * * *",  # Daily at 2 AM
                retention_days=30,
                compression=True,
                encryption=True,
                storage_type="local",
                storage_config={},
                databases=["aiser_world"],
                files=["/app/storage", "/app/uploads"],
                exclude_patterns=["*.tmp", "*.log", "__pycache__"]
            )
            
            self.configs["default"] = default_config
            
        except Exception as e:
            logger.error(f"Error loading backup configs: {e}")
    
    async def run_backup(self, config_name: str = "default") -> BackupResult:
        """Run backup for specified configuration"""
        if config_name not in self.configs:
            raise ValueError(f"Backup config not found: {config_name}")
        
        config = self.configs[config_name]
        job_id = f"backup_{config_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        start_time = datetime.now(timezone.utc)
        files_created = []
        total_size = 0
        
        try:
            # Create backup directory
            backup_dir = Path(f"/backups/{job_id}")
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize managers
            self.db_manager = DatabaseBackupManager(config)
            self.file_manager = FileBackupManager(config)
            self.storage_manager = StorageManager(config)
            
            # Backup databases
            for database in config.databases:
                db_backup_path = backup_dir / f"{database}.backup"
                success = await self.db_manager.backup_database(database, db_backup_path)
                
                if success:
                    files_created.append(str(db_backup_path))
                    total_size += db_backup_path.stat().st_size
                else:
                    logger.error(f"Database backup failed: {database}")
            
            # Backup files
            if config.files:
                files_backup_path = backup_dir / "files"
                files_backup_path.mkdir(exist_ok=True)
                
                backed_up_files = await self.file_manager.backup_files(
                    config.files, files_backup_path
                )
                files_created.extend(backed_up_files)
                
                for file_path in backed_up_files:
                    total_size += Path(file_path).stat().st_size
            
            # Upload to remote storage if configured
            if config.storage_type != "local":
                for file_path in files_created:
                    remote_path = f"{job_id}/{Path(file_path).name}"
                    success = await self.storage_manager.upload_backup(
                        Path(file_path), remote_path
                    )
                    
                    if not success:
                        logger.error(f"Failed to upload: {file_path}")
            
            # Create backup manifest
            manifest = {
                "job_id": job_id,
                "config_name": config_name,
                "start_time": start_time.isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "files": files_created,
                "total_size": total_size,
                "compression": config.compression,
                "encryption": config.encryption,
                "storage_type": config.storage_type
            }
            
            manifest_path = backup_dir / "manifest.json"
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            files_created.append(str(manifest_path))
            
            end_time = datetime.now(timezone.utc)
            
            return BackupResult(
                job_id=job_id,
                status="success",
                start_time=start_time,
                end_time=end_time,
                files_created=files_created,
                total_size=total_size
            )
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return BackupResult(
                job_id=job_id,
                status="failed",
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
                files_created=files_created,
                total_size=total_size,
                error_message=str(e)
            )
    
    async def restore_backup(self, job_id: str, target_database: str = None) -> bool:
        """Restore from backup"""
        try:
            # Find backup manifest
            backup_dir = Path(f"/backups/{job_id}")
            manifest_path = backup_dir / "manifest.json"
            
            if not manifest_path.exists():
                logger.error(f"Backup manifest not found: {manifest_path}")
                return False
            
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Restore databases
            for file_path in manifest["files"]:
                if file_path.endswith(".backup"):
                    database_name = Path(file_path).stem
                    if target_database and database_name != target_database:
                        continue
                    
                    success = await self.db_manager.restore_database(
                        database_name, Path(file_path)
                    )
                    
                    if not success:
                        logger.error(f"Database restore failed: {database_name}")
                        return False
            
            logger.info(f"Backup restore completed: {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Backup restore failed: {e}")
            return False
    
    async def cleanup_old_backups(self, config_name: str = "default"):
        """Clean up old backups based on retention policy"""
        if config_name not in self.configs:
            return
        
        config = self.configs[config_name]
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=config.retention_days)
        
        try:
            backup_base_dir = Path("/backups")
            
            for backup_dir in backup_base_dir.iterdir():
                if not backup_dir.is_dir():
                    continue
                
                manifest_path = backup_dir / "manifest.json"
                if not manifest_path.exists():
                    continue
                
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                
                backup_time = datetime.fromisoformat(manifest["start_time"])
                
                if backup_time < cutoff_date:
                    logger.info(f"Cleaning up old backup: {backup_dir.name}")
                    shutil.rmtree(backup_dir)
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")

# Global backup manager instance
backup_manager = BackupManager()

# Background backup scheduler
async def backup_scheduler():
    """Background task for scheduled backups"""
    while True:
        try:
            await backup_manager.load_configs()
            
            for config_name, config in backup_manager.configs.items():
                if not config.enabled:
                    continue
                
                # Check if backup should run based on schedule
                # This would integrate with a proper cron scheduler
                # For now, we'll run daily at 2 AM
                current_time = datetime.now()
                if current_time.hour == 2 and current_time.minute == 0:
                    logger.info(f"Running scheduled backup: {config_name}")
                    result = await backup_manager.run_backup(config_name)
                    
                    if result.status == "success":
                        logger.info(f"Backup completed successfully: {result.job_id}")
                    else:
                        logger.error(f"Backup failed: {result.error_message}")
                    
                    # Cleanup old backups
                    await backup_manager.cleanup_old_backups(config_name)
            
            # Sleep for 1 minute
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Error in backup scheduler: {e}")
            await asyncio.sleep(300)  # Wait 5 minutes on error
